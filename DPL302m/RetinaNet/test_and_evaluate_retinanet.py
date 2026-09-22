import os
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import cv2
import pydicom
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from torchvision.models.detection import retinanet_resnet50_fpn
from torchvision.models.detection.retinanet import RetinaNetClassificationHead

# ── Configuration ────────────────────────────────────────────────────────────
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
IMG_DIR = "rsna-pneumonia-detection-challenge/stage_2_train_images"
LABELS_CSV = "rsna-pneumonia-detection-challenge/stage_2_train_labels.csv"
TARGET_SIZE = 512
WEIGHTS_PATH = "retinanet_best.pth"
CONFIDENCE_THRESHOLD = 0.35
IOU_THRESHOLD = 0.2

# ── Dataset Definition (Same as Train) ───────────────────────────────────────
class RSNARetinaNetDataset(Dataset):
    def __init__(self, csv_path, img_dir, target_size=512):
        self.img_dir = img_dir
        self.target_size = target_size
        df = pd.read_csv(csv_path)
        self.patient_ids = df['patientId'].unique()
        self.df = df
        
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
                    labels.append(1)
            
            self.patient_data[pid] = {
                'boxes': torch.tensor(boxes, dtype=torch.float32) if len(boxes) > 0 else torch.zeros((0, 4), dtype=torch.float32),
                'labels': torch.tensor(labels, dtype=torch.int64) if len(labels) > 0 else torch.zeros((0,), dtype=torch.int64)
            }

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
        except Exception:
            img_tensor = torch.zeros((3, self.target_size, self.target_size), dtype=torch.float32)
            
        target = self.patient_data[pid].copy()
        return img_tensor, target, pid

def collate_fn(batch):
    return tuple(zip(*batch))

# ── RetinaNet Model ──────────────────────────────────────────────────────────
def get_retinanet_model(num_classes=2):
    model = retinanet_resnet50_fpn(weights=None)
    in_channels = model.backbone.out_channels
    num_anchors = model.head.classification_head.num_anchors
    model.head.classification_head = RetinaNetClassificationHead(in_channels, num_anchors, num_classes)
    return model

# ── Inference and Visualization ──────────────────────────────────────────────
def evaluate():
    print("Loading dataset...")
    dataset = RSNARetinaNetDataset(LABELS_CSV, IMG_DIR, target_size=TARGET_SIZE)
    
    # We use the same split logic to get the validation set
    torch.manual_seed(42)
    indices = torch.randperm(len(dataset)).tolist()
    train_split = int(0.8 * len(dataset))
    val_dataset = torch.utils.data.Subset(dataset, indices[train_split:])
    
    print("Loading RetinaNet model...")
    model = get_retinanet_model(num_classes=2)
    
    if os.path.exists(WEIGHTS_PATH):
        model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=DEVICE))
        print(f"Loaded weights from {WEIGHTS_PATH}")
    else:
        print(f"WARNING: Weights {WEIGHTS_PATH} not found. Running with random weights for demonstration.")
        
    model.to(DEVICE)
    model.eval()
    
    print(f"Running inference on {min(8, len(val_dataset))} sample images...")
    
    fig, axes = plt.subplots(2, 4, figsize=(20, 10))
    axes = axes.flatten()
    
    sample_idx = 0
    with torch.no_grad():
        for i in range(len(val_dataset)):
            if sample_idx >= 8:
                break
                
            img_tensor, target, pid = val_dataset[i]
            
            # We want to pick images that actually have pneumonia for better visualization
            if len(target['boxes']) == 0:
                continue
                
            img_batch = [img_tensor.to(DEVICE)]
            predictions = model(img_batch)[0]
            
            # Move to CPU for plotting
            img_np = img_tensor.permute(1, 2, 0).cpu().numpy()
            pred_boxes = predictions['boxes'].cpu().numpy()
            pred_scores = predictions['scores'].cpu().numpy()
            gt_boxes = target['boxes'].numpy()
            
            ax = axes[sample_idx]
            ax.imshow(img_np[:, :, 0], cmap='gray')
            
            # Draw Ground Truth (Red)
            for box in gt_boxes:
                x1, y1, x2, y2 = box
                rect = patches.Rectangle((x1, y1), x2-x1, y2-y1, linewidth=2, edgecolor='red', facecolor='none', label='Ground Truth')
                ax.add_patch(rect)
                
            # Draw Predictions (Green)
            has_pred = False
            for box, score in zip(pred_boxes, pred_scores):
                if score >= CONFIDENCE_THRESHOLD:
                    x1, y1, x2, y2 = box
                    rect = patches.Rectangle((x1, y1), x2-x1, y2-y1, linewidth=2, edgecolor='green', facecolor='none', label=f'Pred: {score:.2f}')
                    ax.add_patch(rect)
                    ax.text(x1, y1-5, f"{score:.2f}", color='green', fontsize=9, weight='bold')
                    has_pred = True
                    
            ax.set_title(f"Patient: {pid[:8]}...")
            ax.axis('off')
            
            # Handle legends without duplication
            handles, labels = ax.get_legend_handles_labels()
            by_label = dict(zip(labels, handles))
            if by_label:
                ax.legend(by_label.values(), by_label.keys(), loc='lower right', fontsize=8)
                
            sample_idx += 1
            
    plt.tight_layout()
    out_path = "retinanet_evaluation_samples.png"
    plt.savefig(out_path, dpi=150)
    print(f"✓ Inference complete! Visualization saved to: {out_path}")

if __name__ == "__main__":
    evaluate()
