import os
import time
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import cv2
import pydicom
from torchvision.models.detection import retinanet_resnet50_fpn, RetinaNet_ResNet50_FPN_Weights
from torchvision.models.detection.retinanet import RetinaNetClassificationHead

# ── Configuration ────────────────────────────────────────────────────────────
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
IMG_DIR = "rsna-pneumonia-detection-challenge/stage_2_train_images"
LABELS_CSV = "rsna-pneumonia-detection-challenge/stage_2_train_labels.csv"
TARGET_SIZE = 512
BATCH_SIZE = 4
EPOCHS = 10
LR = 1e-5

# ── Dataset Definition ───────────────────────────────────────────────────────
class RSNARetinaNetDataset(Dataset):
    def __init__(self, csv_path, img_dir, target_size=512):
        self.img_dir = img_dir
        self.target_size = target_size
        
        print("Loading dataset labels...")
        df = pd.read_csv(csv_path)
        self.patient_ids = df['patientId'].unique()
        self.df = df
        
        # Precompute target boxes
        self.patient_data = {}
        grouped = df.groupby('patientId')
        for pid, group in grouped:
            boxes = []
            labels = []
            for _, row in group.iterrows():
                if row['Target'] == 1 and not pd.isna(row['x']):
                    scale = target_size / 1024.0
                    x1 = float(row['x']) * scale
                    y1 = float(row['y']) * scale
                    w = float(row['width']) * scale
                    h = float(row['height']) * scale
                    boxes.append([x1, y1, x1 + w, y1 + h])
                    labels.append(1) # Class 1 (Pneumonia)
            
            self.patient_data[pid] = {
                'boxes': torch.tensor(boxes, dtype=torch.float32) if len(boxes) > 0 else torch.zeros((0, 4), dtype=torch.float32),
                'labels': torch.tensor(labels, dtype=torch.int64) if len(labels) > 0 else torch.zeros((0,), dtype=torch.int64)
            }
        print(f"Found {len(self.patient_ids)} unique patients.")

    def __len__(self):
        return len(self.patient_ids)

    def __getitem__(self, idx):
        pid = self.patient_ids[idx]
        dcm_path = os.path.join(self.img_dir, f"{pid}.dcm")
        
        try:
            dcm = pydicom.dcmread(dcm_path)
            img = dcm.pixel_array.astype(np.float32)
            img = (img - img.min()) / (img.max() - img.min() + 1e-6)
            img = cv2.resize(img, (self.target_size, self.target_size))
            img = np.stack([img, img, img], axis=0)
            img_tensor = torch.tensor(img, dtype=torch.float32)
        except Exception as e:
            img_tensor = torch.zeros((3, self.target_size, self.target_size), dtype=torch.float32)
            
        target = self.patient_data[pid].copy()
        return img_tensor, target

def collate_fn(batch):
    return tuple(zip(*batch))

# ── RetinaNet Model ──────────────────────────────────────────────────────────
def get_retinanet_model(num_classes=2):
    model = retinanet_resnet50_fpn(weights=RetinaNet_ResNet50_FPN_Weights.DEFAULT)
    in_channels = model.backbone.out_channels
    num_anchors = model.head.classification_head.num_anchors
    model.head.classification_head = RetinaNetClassificationHead(in_channels, num_anchors, num_classes)
    return model

# ── Training Loop ────────────────────────────────────────────────────────────
def train():
    dataset = RSNARetinaNetDataset(LABELS_CSV, IMG_DIR, target_size=TARGET_SIZE)
    
    torch.manual_seed(42)
    indices = torch.randperm(len(dataset)).tolist()
    train_split = int(0.8 * len(dataset))
    
    train_dataset = torch.utils.data.Subset(dataset, indices[:train_split])
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, collate_fn=collate_fn, num_workers=0)
    
    print(f"Initializing RetinaNet model...")
    model = get_retinanet_model(num_classes=2)
    model.to(DEVICE)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scaler = torch.amp.GradScaler('cuda') if DEVICE.type == 'cuda' else None
    
    print(f"============================================================")
    print(f"Starting RetinaNet Training on {DEVICE}")
    print(f"Total Epochs: {EPOCHS} | Batch Size: {BATCH_SIZE} | Train Samples: {len(train_dataset)}")
    print(f"============================================================")
    
    best_loss = float('inf')
    
    for epoch in range(EPOCHS):
        model.train()
        epoch_loss = 0.0
        start_time = time.time()
        
        for i, (images, targets) in enumerate(train_loader):
            images = list(image.to(DEVICE) for image in images)
            targets = [{k: v.to(DEVICE) for k, v in t.items()} for t in targets]
            
            optimizer.zero_grad(set_to_none=True)
            
            if False:
                pass
            else:
                loss_dict = model(images, targets)
                losses = sum(loss for loss in loss_dict.values())
                losses.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
                optimizer.step()
            
            epoch_loss += losses.item()
            
            if (i + 1) % 50 == 0:
                print(f"  Epoch [{epoch+1}/{EPOCHS}] Step [{i+1}/{len(train_loader)}] Loss: {losses.item():.4f}")
                
        avg_loss = epoch_loss / len(train_loader)
        time_taken = time.time() - start_time
        print(f"✓ Epoch [{epoch+1}/{EPOCHS}] Completed in {time_taken:.1f}s | Average Train Loss: {avg_loss:.4f}")
        
        if avg_loss < best_loss and not torch.isnan(torch.tensor(avg_loss)):
            best_loss = avg_loss
            torch.save(model.state_dict(), "retinanet_best.pth")
            print(f"  [SAVED] New best weights saved to 'retinanet_best.pth'")
        torch.save(model.state_dict(), "retinanet_last.pth")

if __name__ == "__main__":
    train()
