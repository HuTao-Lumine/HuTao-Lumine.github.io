// ==UserScript==
// @name         Quiz Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Tự động giải và điền đáp án bài kiểm tra bằng AI.
// @author       You
// @match        *://*.coursera.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      generativelanguage.googleapis.com
// @connect      cloudfront.net
// @connect      amazonaws.com
// @connect      coursera.org
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const pageWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Quản lý dữ liệu cài đặt (tương thích ngược với bản cũ) ---
    function getSavedApiKeys() {
        let keys = GM_getValue('geminiApiKeys', null);
        if (!Array.isArray(keys)) {
            const legacyKey = (GM_getValue('geminiApiKey', '') || '').trim();
            keys = legacyKey ? [legacyKey] : [];
            GM_setValue('geminiApiKeys', keys);
        }
        return keys.map(k => String(k || '').trim()).filter(Boolean);
    }

    function saveApiKeys(keys) {
        const cleaned = [];
        const seen = new Set();
        keys.forEach(k => {
            const trimmed = String(k || '').trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                cleaned.push(trimmed);
            }
        });
        GM_setValue('geminiApiKeys', cleaned);
        GM_setValue('geminiApiKey', cleaned[0] || '');
        return cleaned;
    }

    function getSavedModel() {
        return (GM_getValue('geminiModelName', '') || '').trim();
    }

    function saveSelectedModel(modelId) {
        GM_setValue('geminiModelName', String(modelId || '').trim());
    }

    let activeKeyIndex = 0;

    // 1. UI Khung chính
    const mainUI = document.createElement('div');
    mainUI.style.position = 'fixed';
    mainUI.style.top = '80px';
    mainUI.style.right = '20px';
    mainUI.style.zIndex = '2147483647'; // Giá trị tối đa của z-index (32-bit integer)
    mainUI.style.display = 'flex';
    mainUI.style.flexDirection = 'column';
    mainUI.style.alignItems = 'flex-end';
    document.body.appendChild(mainUI);

    // Đảm bảo UI luôn nằm trên cùng (tránh bị che khi Coursera chuyển trang SPA hoặc mở modal full-screen)
    setInterval(() => {
        if (!document.body.contains(mainUI)) {
            document.body.appendChild(mainUI);
        } else if (document.body.lastElementChild !== mainUI && !mainUI.contains(document.activeElement)) {
            document.body.appendChild(mainUI);
        }
    }, 1000);

    // Nút "T" thu nhỏ/phóng to (Draggable)
    const toggleBtn = document.createElement('div');
    toggleBtn.innerText = 'T';
    toggleBtn.style.width = '40px';
    toggleBtn.style.height = '40px';
    toggleBtn.style.backgroundColor = '#0056D2';
    toggleBtn.style.color = 'white';
    toggleBtn.style.borderRadius = '50%';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.justifyContent = 'center';
    toggleBtn.style.fontWeight = 'bold';
    toggleBtn.style.fontSize = '20px';
    toggleBtn.style.cursor = 'move';
    toggleBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    toggleBtn.style.marginBottom = '10px';
    toggleBtn.style.userSelect = 'none';
    mainUI.appendChild(toggleBtn);

    // Popup nhỏ gọn khi bấm nút T: chỉ gồm nút "Trả lời" + nút mở Dialog Cài đặt
    const setupUI = document.createElement('div');
    setupUI.style.padding = '12px';
    setupUI.style.backgroundColor = '#ffffff';
    setupUI.style.border = '1px solid #ccc';
    setupUI.style.borderRadius = '8px';
    setupUI.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    setupUI.style.width = '190px';
    setupUI.style.fontFamily = 'sans-serif';
    setupUI.style.display = 'none'; // Ẩn mặc định
    setupUI.innerHTML = `
        <button id="auto-answer-btn" style="width: 100%; padding: 10px; background-color: #0056D2; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; margin-bottom: 8px;">Trả lời</button>
        <button id="open-ai-settings-btn" style="width: 100%; padding: 8px; background-color: #f1f3f5; color: #212529; border: 1px solid #ced4da; border-radius: 6px; cursor: pointer; font-size: 13px;">⚙ Cài đặt AI</button>
    `;
    mainUI.appendChild(setupUI);

    // Dialog (Modal) Cài đặt API Keys & Chọn Model
    const settingsOverlay = document.createElement('div');
    settingsOverlay.style.position = 'fixed';
    settingsOverlay.style.inset = '0';
    settingsOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    settingsOverlay.style.display = 'none';
    settingsOverlay.style.alignItems = 'center';
    settingsOverlay.style.justifyContent = 'center';
    settingsOverlay.style.zIndex = '2147483647';
    settingsOverlay.style.fontFamily = 'sans-serif';
    settingsOverlay.innerHTML = `
        <div id="ai-settings-dialog" style="background: #ffffff; color: #212529; width: 460px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 14px 18px; border-bottom: 1px solid #e9ecef; display: flex; align-items: center; justify-content: space-between;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #212529;">Cài đặt AI (Gemini)</h3>
                <button id="close-ai-settings-btn" type="button" style="background: none; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: #6c757d; padding: 4px;">✕</button>
            </div>
            <div style="padding: 16px 18px; overflow-y: auto; flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <label style="font-size: 13px; font-weight: 600; color: #343a40;">Danh sách Gemini API Key:</label>
                    <button id="add-api-key-btn" type="button" style="padding: 4px 10px; background-color: #e7f1ff; color: #0056D2; border: 1px solid #b6d4fe; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">+ Thêm Key</button>
                </div>
                <div id="api-keys-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 210px; overflow-y: auto; margin-bottom: 14px; padding-right: 2px;"></div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <label style="font-size: 13px; font-weight: 600; color: #343a40;">Model khả dụng (có quota):</label>
                    <button id="fetch-models-btn" type="button" style="padding: 4px 10px; background-color: #f1f3f5; color: #212529; border: 1px solid #ced4da; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">↻ Lấy danh sách Model</button>
                </div>
                <select id="gemini-model-select" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #ced4da; border-radius: 6px; font-size: 13px; background-color: #fff; color: #212529; margin-bottom: 14px;">
                    <option value="">-- Bấm "Lấy danh sách Model" để tải model có quota --</option>
                </select>

                <div id="ai-settings-msg" style="font-size: 12px; text-align: center; display: none; padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;"></div>
            </div>
            <div style="padding: 12px 18px; border-top: 1px solid #e9ecef; background: #f8f9fa; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <button id="check-keys-btn" type="button" style="padding: 8px 14px; background-color: #e7f1ff; color: #0056D2; border: 1px solid #b6d4fe; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">Kiểm tra Key</button>
                <div style="display: flex; gap: 8px;">
                    <button id="cancel-ai-settings-btn" type="button" style="padding: 8px 14px; background-color: #fff; color: #495057; border: 1px solid #ced4da; border-radius: 6px; cursor: pointer; font-size: 13px;">Đóng</button>
                    <button id="save-ai-settings" type="button" style="padding: 8px 18px; background-color: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">Lưu và đóng</button>
                </div>
            </div>
        </div>
    `;
    mainUI.appendChild(settingsOverlay);

    // Ngăn Coursera chặn phím, cướp focus (Focus Trap) hay sự kiện chuột trên cả popup và dialog
    ['focusin', 'focusout', 'focus', 'blur', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'keypress', 'input', 'paste', 'change'].forEach(evt => {
        setupUI.addEventListener(evt, (e) => e.stopPropagation());
        settingsOverlay.addEventListener(evt, (e) => e.stopPropagation());
    });

    // Logic Kéo Thả (Drag and Drop) cho Nút T
    let isDragging = false;
    let offsetX, offsetY;
    let startX, startY;
    let hasDragged = false;
    toggleBtn.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        offsetX = e.clientX - mainUI.getBoundingClientRect().left;
        offsetY = e.clientY - mainUI.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) {
            hasDragged = true;
        }
        
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        
        const rect = mainUI.getBoundingClientRect();
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + rect.width > window.innerWidth) newLeft = window.innerWidth - rect.width;
        if (newTop + rect.height > window.innerHeight) newTop = window.innerHeight - rect.height;

        mainUI.style.left = `${newLeft}px`;
        mainUI.style.top = `${newTop}px`;
        mainUI.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Thu nhỏ/Phóng to khi click (nếu không phải là drag)
    toggleBtn.addEventListener('click', () => {
        if (!hasDragged) {
            const isHidden = setupUI.style.display === 'none';
            setupUI.style.display = isHidden ? 'block' : 'none';
            
            if (isHidden) {
                setTimeout(() => {
                    const rect = mainUI.getBoundingClientRect();
                    let currentLeft = rect.left;
                    let currentTop = rect.top;
                    let needsAdjust = false;

                    if (rect.right > window.innerWidth) {
                        currentLeft -= (rect.right - window.innerWidth + 15);
                        needsAdjust = true;
                    }
                    if (rect.bottom > window.innerHeight) {
                        currentTop -= (rect.bottom - window.innerHeight + 15);
                        needsAdjust = true;
                    }
                    if (currentLeft < 0) {
                        currentLeft = 15;
                        needsAdjust = true;
                    }
                    if (currentTop < 0) {
                        currentTop = 15;
                        needsAdjust = true;
                    }

                    if (needsAdjust) {
                        mainUI.style.left = `${currentLeft}px`;
                        mainUI.style.top = `${currentTop}px`;
                        mainUI.style.right = 'auto';
                    }
                }, 0);
            }
        }
    });

    // --- Logic Dialog Quản lý API Key, Kiểm tra Key & Lọc Model có Quota ---
    const apiKeysListEl = document.getElementById('api-keys-list');
    const modelSelectEl = document.getElementById('gemini-model-select');
    const settingsMsgEl = document.getElementById('ai-settings-msg');
    const saveBtn = document.getElementById('save-ai-settings');
    const checkKeysBtn = document.getElementById('check-keys-btn');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');

    function showSettingsMessage(text, type = 'info') {
        const styles = {
            success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            warning: { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
            error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            info: { bg: '#e7f1ff', color: '#004085', border: '#b8daff' }
        };
        const st = styles[type] || styles.info;
        settingsMsgEl.style.backgroundColor = st.bg;
        settingsMsgEl.style.color = st.color;
        settingsMsgEl.style.border = `1px solid ${st.border}`;
        settingsMsgEl.innerText = text;
        settingsMsgEl.style.display = 'block';
    }

    function createApiKeyRow(initialValue = '') {
        const row = document.createElement('div');
        row.className = 'gemini-key-row';
        row.dataset.checkState = 'unknown';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '6px';

        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'gemini-key-input';
        input.value = initialValue;
        input.placeholder = 'Nhập Gemini API Key...';
        input.style.flex = '1';
        input.style.boxSizing = 'border-box';
        input.style.padding = '7px 8px';
        input.style.border = '1px solid #ced4da';
        input.style.borderRadius = '5px';
        input.style.fontSize = '13px';
        input.style.color = '#212529';
        input.style.backgroundColor = '#fff';

        const statusBadge = document.createElement('span');
        statusBadge.className = 'gemini-key-status';
        statusBadge.style.fontSize = '11px';
        statusBadge.style.minWidth = '64px';
        statusBadge.style.textAlign = 'center';
        statusBadge.style.padding = '3px 6px';
        statusBadge.style.borderRadius = '4px';
        statusBadge.style.backgroundColor = '#f1f3f5';
        statusBadge.style.color = '#6c757d';
        statusBadge.innerText = 'Chưa KT';

        const toggleVisBtn = document.createElement('button');
        toggleVisBtn.type = 'button';
        toggleVisBtn.title = 'Hiện/Ẩn API Key';
        toggleVisBtn.innerText = '👁';
        toggleVisBtn.style.padding = '5px 7px';
        toggleVisBtn.style.background = '#f8f9fa';
        toggleVisBtn.style.border = '1px solid #ced4da';
        toggleVisBtn.style.borderRadius = '5px';
        toggleVisBtn.style.cursor = 'pointer';
        toggleVisBtn.style.fontSize = '12px';
        toggleVisBtn.addEventListener('click', () => {
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.title = 'Xóa API Key này';
        removeBtn.innerText = '✕';
        removeBtn.style.padding = '5px 8px';
        removeBtn.style.background = '#fff5f5';
        removeBtn.style.color = '#dc3545';
        removeBtn.style.border = '1px solid #ffc9c9';
        removeBtn.style.borderRadius = '5px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontSize = '12px';
        removeBtn.addEventListener('click', () => {
            row.remove();
            if (apiKeysListEl.children.length === 0) {
                createApiKeyRow('');
            }
        });

        input.addEventListener('input', () => {
            row.dataset.checkState = 'unknown';
            input.style.borderColor = '#ced4da';
            statusBadge.style.backgroundColor = '#f1f3f5';
            statusBadge.style.color = '#6c757d';
            statusBadge.innerText = 'Chưa KT';
            statusBadge.title = '';
        });

        row.appendChild(input);
        row.appendChild(statusBadge);
        row.appendChild(toggleVisBtn);
        row.appendChild(removeBtn);
        apiKeysListEl.appendChild(row);
        return { row, input, statusBadge };
    }

    function setRowStatus(rowEl, state, message = '') {
        const input = rowEl.querySelector('.gemini-key-input');
        const badge = rowEl.querySelector('.gemini-key-status');
        if (!badge || !input) return;

        rowEl.dataset.checkState = state;
        badge.title = message;
        if (state === 'checking') {
            input.style.borderColor = '#f39c12';
            badge.style.backgroundColor = '#fff3cd';
            badge.style.color = '#856404';
            badge.innerText = 'Đang KT...';
        } else if (state === 'valid') {
            input.style.borderColor = '#28a745';
            badge.style.backgroundColor = '#d4edda';
            badge.style.color = '#155724';
            badge.innerText = '✓ Hợp lệ';
        } else if (state === 'invalid') {
            input.style.borderColor = '#dc3545';
            badge.style.backgroundColor = '#f8d7da';
            badge.style.color = '#721c24';
            badge.innerText = '✗ Lỗi';
        } else {
            input.style.borderColor = '#ced4da';
            badge.style.backgroundColor = '#f1f3f5';
            badge.style.color = '#6c757d';
            badge.innerText = 'Chưa KT';
        }
    }

    function renderApiKeyRows(keys) {
        apiKeysListEl.innerHTML = '';
        if (keys.length === 0) {
            createApiKeyRow('');
        } else {
            keys.forEach(k => createApiKeyRow(k));
        }
    }

    function getDialogKeyRows() {
        const rows = Array.from(apiKeysListEl.querySelectorAll('.gemini-key-row'));
        const nonEmpty = [];
        rows.forEach(row => {
            const val = (row.querySelector('.gemini-key-input')?.value || '').trim();
            if (val) {
                nonEmpty.push({ row, key: val });
            }
        });
        return nonEmpty;
    }

    function populateModelSelect(models, preferredModel = '') {
        modelSelectEl.innerHTML = '';
        if (!Array.isArray(models) || models.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = '-- Bấm "Lấy danh sách Model" để tải model có quota --';
            modelSelectEl.appendChild(opt);
            return;
        }

        models.forEach(m => {
            const id = typeof m === 'string' ? m : m.id;
            const label = (typeof m === 'object' && m.displayName && m.displayName !== id)
                ? `${m.displayName} (${id})`
                : id;
            const opt = document.createElement('option');
            opt.value = id;
            opt.innerText = label;
            modelSelectEl.appendChild(opt);
        });

        const ids = models.map(m => (typeof m === 'string' ? m : m.id));
        let chosen = preferredModel && ids.includes(preferredModel) ? preferredModel : '';
        if (!chosen) {
            chosen = ids.find(id => id.includes('flash')) || ids[0];
        }
        modelSelectEl.value = chosen;
        saveSelectedModel(chosen);
    }

    // Kiểm tra nhanh API Key có hoạt động không (không tốn quota RPD của generateContent)
    function verifyApiKeyWorks(apiKey) {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(apiKey)}`;
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(true);
                    } else {
                        let msg = `HTTP ${res.status}`;
                        try {
                            const errJson = JSON.parse(res.responseText);
                            if (errJson?.error?.message) msg = errJson.error.message;
                        } catch (_) {}
                        reject(new Error(msg));
                    }
                },
                onerror: () => reject(new Error('Lỗi kết nối mạng'))
            });
        });
    }

    // Lấy danh sách các model ứng viên hỗ trợ xuất văn bản từ /v1beta/models
    function fetchCandidateModels(apiKey) {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(apiKey)}`;
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const data = JSON.parse(res.responseText);
                            const excludedKeywords = [
                                'embedding', 'aqa', '-tts', 'tts-', 'imagen', 'veo', 'lyria',
                                'robotics', 'computer-use', 'native-audio', 'image-generation'
                            ];
                            const models = (data.models || [])
                                .filter(m => {
                                    if (!Array.isArray(m.supportedGenerationMethods) || !m.supportedGenerationMethods.includes('generateContent')) {
                                        return false;
                                    }
                                    const lowerName = String(m.name || '').toLowerCase();
                                    return lowerName && !excludedKeywords.some(kw => lowerName.includes(kw));
                                })
                                .map(m => {
                                    const id = m.name.replace(/^models\//, '');
                                    return { id, displayName: m.displayName || id };
                                })
                                .sort((a, b) => {
                                    const aFlash = a.id.includes('flash') ? 0 : 1;
                                    const bFlash = b.id.includes('flash') ? 0 : 1;
                                    if (aFlash !== bFlash) return aFlash - bFlash;
                                    return b.id.localeCompare(a.id, undefined, { numeric: true });
                                });
                            resolve(models);
                        } catch (e) {
                            reject(new Error('Lỗi đọc danh sách model'));
                        }
                    } else {
                        let msg = `HTTP ${res.status}`;
                        try {
                            const errJson = JSON.parse(res.responseText);
                            if (errJson?.error?.message) msg = errJson.error.message;
                        } catch (_) {}
                        reject(new Error(msg));
                    }
                },
                onerror: () => reject(new Error('Lỗi kết nối mạng'))
            });
        });
    }

    // Kiểm tra thực tế xem model có được cấp quota (> 0) cho API Key này không (loại bỏ các model 0/0 như Genie 4, Gemini 4 Neon...)
    function checkModelHasQuota(apiKey, modelId) {
        return new Promise((resolve) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const body = JSON.stringify({
                contents: [{ parts: [{ text: '1' }] }],
                generationConfig: { maxOutputTokens: 1 }
            });

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: { 'Content-Type': 'application/json' },
                data: body,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(true);
                        return;
                    }

                    if (res.status === 429) {
                        try {
                            const errJson = JSON.parse(res.responseText);
                            const msg = String(errJson?.error?.message || '');
                            const details = Array.isArray(errJson?.error?.details) ? errJson.error.details : [];

                            let foundZeroLimit = /limit:\s*0\b/i.test(msg);
                            let foundPositiveLimit = /limit:\s*([1-9]\d*)/i.test(msg);

                            details.forEach(d => {
                                if (Array.isArray(d.violations)) {
                                    d.violations.forEach(v => {
                                        if (v.quotaValue !== undefined) {
                                            const val = Number(v.quotaValue);
                                            if (val === 0) foundZeroLimit = true;
                                            if (val > 0) foundPositiveLimit = true;
                                        }
                                    });
                                }
                            });

                            if (foundZeroLimit) {
                                resolve(false);
                                return;
                            }
                            if (foundPositiveLimit) {
                                resolve(true);
                                return;
                            }
                        } catch (_) {}
                        resolve(false);
                        return;
                    }

                    resolve(false);
                },
                onerror: () => resolve(false)
            });
        });
    }

    async function fetchQuotaModelsFromKeys(keys, onProgress) {
        let workingKey = null;
        let candidates = null;
        let lastErr = null;

        for (const key of keys) {
            try {
                candidates = await fetchCandidateModels(key);
                workingKey = key;
                break;
            } catch (err) {
                lastErr = err;
            }
        }

        if (!workingKey || !candidates) {
            throw lastErr || new Error('Không tìm thấy API Key hợp lệ để tải danh sách model.');
        }

        const quotaModels = [];
        const total = candidates.length;
        let completed = 0;
        const concurrency = 4;

        for (let i = 0; i < total; i += concurrency) {
            const batch = candidates.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map(async (m) => {
                    const ok = await checkModelHasQuota(workingKey, m.id);
                    completed++;
                    if (typeof onProgress === 'function') {
                        onProgress(completed, total);
                    }
                    return ok ? m : null;
                })
            );
            batchResults.forEach(item => {
                if (item) quotaModels.push(item);
            });
        }

        return {
            quotaModels,
            totalCandidates: total,
            filteredOutCount: total - quotaModels.length
        };
    }

    function openSettingsDialog() {
        const savedKeys = getSavedApiKeys();
        renderApiKeyRows(savedKeys);
        const cachedModels = GM_getValue('geminiCachedModels', []);
        if (Array.isArray(cachedModels) && cachedModels.length > 0) {
            populateModelSelect(cachedModels, getSavedModel());
        }
        settingsMsgEl.style.display = 'none';
        settingsOverlay.style.display = 'flex';
    }

    function closeSettingsDialog() {
        settingsOverlay.style.display = 'none';
    }

    document.getElementById('open-ai-settings-btn').addEventListener('click', openSettingsDialog);
    document.getElementById('close-ai-settings-btn').addEventListener('click', closeSettingsDialog);
    document.getElementById('cancel-ai-settings-btn').addEventListener('click', closeSettingsDialog);
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) closeSettingsDialog();
    });

    document.getElementById('add-api-key-btn').addEventListener('click', () => {
        const { input } = createApiKeyRow('');
        input.focus();
    });

    modelSelectEl.addEventListener('change', () => {
        if (modelSelectEl.value) {
            saveSelectedModel(modelSelectEl.value);
        }
    });

    // 1. Nút "Kiểm tra Key": chỉ kiểm tra từng API Key hoạt động hay không (không lưu, không tốn RPD generateContent)
    checkKeysBtn.addEventListener('click', async () => {
        const nonEmptyRows = getDialogKeyRows();
        if (nonEmptyRows.length === 0) {
            showSettingsMessage('Vui lòng nhập ít nhất 1 API Key để kiểm tra.', 'warning');
            return;
        }

        const origText = checkKeysBtn.innerText;
        checkKeysBtn.innerText = 'Đang kiểm tra...';
        checkKeysBtn.disabled = true;
        showSettingsMessage('Đang kiểm tra trạng thái hoạt động của các API Key...', 'info');

        nonEmptyRows.forEach(({ row }) => setRowStatus(row, 'checking'));

        const results = await Promise.all(
            nonEmptyRows.map(async ({ row, key }) => {
                try {
                    await verifyApiKeyWorks(key);
                    setRowStatus(row, 'valid', 'API Key hoạt động tốt');
                    return true;
                } catch (err) {
                    setRowStatus(row, 'invalid', err.message);
                    return false;
                }
            })
        );

        const validCount = results.filter(Boolean).length;
        if (validCount === results.length) {
            showSettingsMessage(`Tất cả ${validCount}/${results.length} API Key đều hoạt động tốt!`, 'success');
        } else if (validCount > 0) {
            showSettingsMessage(`${validCount}/${results.length} API Key hoạt động (${results.length - validCount} key lỗi).`, 'warning');
        } else {
            showSettingsMessage(`Tất cả ${results.length} API Key đều không hợp lệ hoặc gặp lỗi.`, 'error');
        }

        checkKeysBtn.innerText = origText;
        checkKeysBtn.disabled = false;
    });

    // 2. Nút "Lấy danh sách Model": tải và lọc chỉ hiển thị các model thực sự có quota (> 0) cho API Key
    fetchModelsBtn.addEventListener('click', async () => {
        const dialogKeys = getDialogKeyRows().map(r => r.key);
        const keysToUse = dialogKeys.length > 0 ? dialogKeys : getSavedApiKeys();

        if (keysToUse.length === 0) {
            showSettingsMessage('Vui lòng nhập ít nhất 1 API Key trước khi lấy danh sách model.', 'warning');
            return;
        }

        const origText = fetchModelsBtn.innerText;
        fetchModelsBtn.innerText = 'Đang dò quota...';
        fetchModelsBtn.disabled = true;
        showSettingsMessage('Đang tải danh sách model và kiểm tra quota khả dụng...', 'info');

        try {
            const { quotaModels, filteredOutCount } = await fetchQuotaModelsFromKeys(keysToUse, (done, total) => {
                showSettingsMessage(`Đang kiểm tra quota từng model (${done}/${total})...`, 'info');
            });

            GM_setValue('geminiCachedModels', quotaModels);
            populateModelSelect(quotaModels, modelSelectEl.value || getSavedModel());

            if (quotaModels.length > 0) {
                showSettingsMessage(
                    `Đã tìm thấy ${quotaModels.length} model có quota khả dụng (đã ẩn ${filteredOutCount} model 0/0).`,
                    'success'
                );
            } else {
                showSettingsMessage('Không tìm thấy model nào có quota khả dụng cho API Key này.', 'error');
            }
        } catch (err) {
            showSettingsMessage(`Lỗi khi lấy danh sách model: ${err.message}`, 'error');
        } finally {
            fetchModelsBtn.innerText = origText;
            fetchModelsBtn.disabled = false;
        }
    });

    // 3. Nút "Lưu và đóng": lưu danh sách API Key + Model đang chọn và đóng dialog
    saveBtn.addEventListener('click', () => {
        const nonEmptyRows = getDialogKeyRows();
        const validOrUnknown = nonEmptyRows.filter(r => r.row.dataset.checkState !== 'invalid').map(r => r.key);
        const knownInvalid = nonEmptyRows.filter(r => r.row.dataset.checkState === 'invalid').map(r => r.key);
        saveApiKeys([...validOrUnknown, ...knownInvalid]);
        activeKeyIndex = 0;

        const chosenModel = modelSelectEl.value || getSavedModel();
        saveSelectedModel(chosenModel);
        closeSettingsDialog();
    });

    // Khởi tạo khi tải trang: nạp danh sách model đã lưu từ bộ nhớ đệm (không tự gọi API để tiết kiệm RPD)
    (function initCachedModelsOnLoad() {
        getSavedApiKeys();
        const cachedModels = GM_getValue('geminiCachedModels', []);
        if (Array.isArray(cachedModels) && cachedModels.length > 0) {
            populateModelSelect(cachedModels, getSavedModel());
        }
    })();

    // --- Các hàm trích xuất câu hỏi, hình ảnh và điền đáp án (hỗ trợ cả <textarea>, <input> và Slate RichTextEditor) ---
    const TEXT_INPUT_SELECTOR = [
        'textarea:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        'input[type="text"]:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        'input[type="number"]:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        '[data-slate-editor="true"][contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]:not([aria-hidden="true"])'
    ].join(', ');

    const SUPPORTED_GEMINI_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']);

    function getCleanQuestionText(container) {
        const promptNode = container.querySelector('[id^="prompt-"], [data-testid="legend"] [data-testid="cml-viewer"], [data-testid="legend"] .rc-CML');
        if (!promptNode) return 'Không tìm thấy nội dung câu hỏi';

        const checkpoints = promptNode.querySelectorAll('[data-testid="acknowledgment-checkpoint"], [data-assessment-checkpoint]');
        const prevDisplays = [];
        checkpoints.forEach((el, i) => {
            prevDisplays[i] = el.style.display;
            el.style.display = 'none';
        });

        const text = promptNode.innerText.trim();

        checkpoints.forEach((el, i) => {
            el.style.display = prevDisplays[i];
        });
        return text;
    }

    function getOptionElements(container) {
        const rcOptions = container.querySelectorAll('.rc-Option');
        if (rcOptions.length > 0) return rcOptions;
        return container.querySelectorAll('label.cds-checkboxAndRadio-label');
    }

    function getOptionText(option) {
        const optionTextNode = option.querySelector('.cds-checkboxAndRadio-labelText, .rc-CML, [data-testid="cml-viewer"]');
        return optionTextNode ? optionTextNode.innerText.trim() : option.innerText.trim();
    }

    function bytesToBase64(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    function detectMimeFromBytes(bytes, headerMime = '') {
        if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'image/png';
        }
        if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'image/jpeg';
        }
        if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return 'image/webp';
        }
        return (headerMime.split(';')[0] || '').trim().toLowerCase();
    }

    function rasterizeDataUrlToPng(dataUrl) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = tempImg.naturalWidth || tempImg.width || 800;
                    canvas.height = tempImg.naturalHeight || tempImg.height || 600;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                    const pngUrl = canvas.toDataURL('image/png');
                    resolve({
                        mime_type: 'image/png',
                        data: pngUrl.split(',')[1]
                    });
                } catch (err) {
                    reject(err);
                }
            };
            tempImg.onerror = () => reject(new Error('Không thể rasterize ảnh sang PNG'));
            tempImg.src = dataUrl;
        });
    }

    async function captureImageElement(img, cache) {
        const src = img.currentSrc || img.src;
        if (!src) return null;
        if (cache.has(src)) return cache.get(src);

        const promise = (async () => {
            if (img.complete && img.naturalWidth > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    return {
                        mime_type: 'image/png',
                        data: dataUrl.split(',')[1]
                    };
                } catch (_) {
                    // Canvas bị CORS-tainted -> chuyển sang GM_xmlhttpRequest
                }
            }

            if (src.startsWith('data:')) {
                const match = src.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
                if (match) {
                    const mime = (match[1] || '').toLowerCase();
                    if (match[2] && SUPPORTED_GEMINI_MIMES.has(mime)) {
                        return { mime_type: mime, data: match[3] };
                    }
                    try {
                        return await rasterizeDataUrlToPng(src);
                    } catch (_) {
                        return null;
                    }
                }
            }

            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: src,
                    responseType: 'arraybuffer',
                    onload: async (res) => {
                        if (res.status >= 200 && res.status < 300 && res.response) {
                            try {
                                const bytes = new Uint8Array(res.response);
                                const headerMatch = (res.responseHeaders || '').match(/content-type:\s*([^\r\n]+)/i);
                                const mime = detectMimeFromBytes(bytes, headerMatch ? headerMatch[1] : '');
                                const b64 = bytesToBase64(bytes);

                                if (SUPPORTED_GEMINI_MIMES.has(mime)) {
                                    resolve({ mime_type: mime, data: b64 });
                                } else {
                                    const fallbackMime = mime || 'image/svg+xml';
                                    const pngData = await rasterizeDataUrlToPng(`data:${fallbackMime};base64,${b64}`);
                                    resolve(pngData);
                                }
                            } catch (e) {
                                console.warn('Lỗi xử lý dữ liệu ảnh:', src, e);
                                resolve(null);
                            }
                        } else {
                            console.warn('Không tải được ảnh:', src, res.status);
                            resolve(null);
                        }
                    },
                    onerror: (err) => {
                        console.warn('Lỗi mạng khi tải ảnh:', src, err);
                        resolve(null);
                    }
                });
            });
        })();

        cache.set(src, promise);
        return promise;
    }

    // Gán giá trị cho <textarea> / <input> controlled bởi React
    function setReactInputValue(element, value) {
        const previousValue = element.value;
        const proto = element.tagName === 'TEXTAREA'
            ? (pageWin.HTMLTextAreaElement || window.HTMLTextAreaElement).prototype
            : (pageWin.HTMLInputElement || window.HTMLInputElement).prototype;
        const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            || Object.getOwnPropertyDescriptor(
                element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                'value'
            )?.set;

        if (nativeValueSetter) {
            nativeValueSetter.call(element, value);
        } else {
            element.value = value;
        }

        if (element._valueTracker) {
            element._valueTracker.setValue(previousValue === value ? '' : previousValue);
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // --- Hỗ trợ điền văn bản cho Slate.js / Rich Text Editor (part-Submission_RichTextQuestion) ---
    function isSlateEditorObject(obj) {
        return Boolean(
            obj &&
            typeof obj === 'object' &&
            Array.isArray(obj.children) &&
            typeof obj.apply === 'function' &&
            typeof obj.insertText === 'function' &&
            typeof obj.insertBreak === 'function'
        );
    }

    function findSlateEditor(editorEl) {
        try {
            const keys = Object.keys(editorEl);
            const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (!fiberKey) return null;

            let curr = editorEl[fiberKey];
            for (let depth = 0; curr && depth < 35; depth++, curr = curr.return) {
                const props = curr.memoizedProps;
                if (props) {
                    if (isSlateEditorObject(props.editor)) return props.editor;
                    if (isSlateEditorObject(props.value)) return props.value;
                    if (props.value && isSlateEditorObject(props.value.editor)) return props.value.editor;
                    if (Array.isArray(props.value) && isSlateEditorObject(props.value[0])) return props.value[0];
                }
                let hook = curr.memoizedState;
                let steps = 0;
                while (hook && steps < 25) {
                    const ms = hook.memoizedState;
                    if (isSlateEditorObject(ms)) return ms;
                    if (ms && isSlateEditorObject(ms.current)) return ms.current;
                    hook = hook.next;
                    steps++;
                }
            }
        } catch (_) {}
        return null;
    }

    function getFirstLeafPoint(nodes, path = []) {
        const first = nodes && nodes[0];
        if (!first) return { path: [0, 0], offset: 0 };
        if (typeof first.text === 'string') return { path: [...path, 0], offset: 0 };
        return getFirstLeafPoint(first.children || [], [...path, 0]);
    }

    function getLastLeafPoint(nodes, path = []) {
        if (!nodes || nodes.length === 0) return { path: [0, 0], offset: 0 };
        const idx = nodes.length - 1;
        const last = nodes[idx];
        if (typeof last.text === 'string') return { path: [...path, idx], offset: last.text.length };
        return getLastLeafPoint(last.children || [], [...path, idx]);
    }

    function hasRichEditorContent(editorEl) {
        if (editorEl.hasAttribute('data-slate-editor')) {
            const strNodes = editorEl.querySelectorAll('[data-slate-string="true"]');
            return Array.from(strNodes).some(n => n.textContent.trim().length > 0);
        }
        return editorEl.innerText.trim().length > 0;
    }

    function selectRichEditorRange(editorEl) {
        const sel = pageWin.getSelection ? pageWin.getSelection() : window.getSelection();
        const doc = pageWin.document || document;
        if (!sel) return false;

        const stringNodes = editorEl.querySelectorAll('[data-slate-string="true"]');
        const range = doc.createRange();

        if (stringNodes.length > 0) {
            const firstText = stringNodes[0].firstChild || stringNodes[0];
            const lastNode = stringNodes[stringNodes.length - 1];
            const lastText = lastNode.firstChild || lastNode;
            const endOffset = lastText.nodeType === 3 ? lastText.textContent.length : 0;
            range.setStart(firstText, 0);
            range.setEnd(lastText, endOffset);
        } else {
            const zw = editorEl.querySelector('[data-slate-zero-width]') || editorEl;
            const target = zw.firstChild || zw;
            range.setStart(target, 0);
            range.collapse(true);
        }

        sel.removeAllRanges();
        sel.addRange(range);
        doc.dispatchEvent(new Event('selectionchange'));
        return stringNodes.length > 0;
    }

    async function setRichTextEditorValue(editorEl, value) {
        const normalizedText = String(value).replace(/\r\n/g, '\n').trim();
        if (!normalizedText) return;

        // Cách 1: Thao tác trực tiếp trên Slate Editor instance thông qua React Fiber (ổn định tuyệt đối, hỗ trợ nhiều đoạn văn)
        const slateEditor = findSlateEditor(editorEl);
        if (slateEditor) {
            try {
                const start = getFirstLeafPoint(slateEditor.children);
                const end = getLastLeafPoint(slateEditor.children);
                slateEditor.apply({
                    type: 'set_selection',
                    properties: slateEditor.selection,
                    newProperties: { anchor: start, focus: end }
                });
                if (start.path.join(',') !== end.path.join(',') || start.offset !== end.offset) {
                    if (typeof slateEditor.deleteFragment === 'function') {
                        slateEditor.deleteFragment();
                    }
                }

                const lines = normalizedText.split('\n');
                lines.forEach((line, idx) => {
                    if (idx > 0) {
                        slateEditor.insertBreak();
                    }
                    if (line.length > 0) {
                        slateEditor.insertText(line);
                    }
                });

                await sleep(50);
                if (hasRichEditorContent(editorEl)) {
                    editorEl.dispatchEvent(new Event('blur', { bubbles: true }));
                    return;
                }
            } catch (e) {
                console.warn('Slate Fiber insert lỗi, chuyển sang cơ chế sự kiện DOM:', e);
            }
        }

        // Cách 2: Focus + đợi Slate onFocus ổn định, xóa nội dung cũ (nếu có), rồi gửi sự kiện Paste chuẩn
        editorEl.focus();
        await sleep(50);
        const hadExisting = selectRichEditorRange(editorEl);
        await sleep(150);
        if (hadExisting) {
            const IE = pageWin.InputEvent || InputEvent;
            editorEl.dispatchEvent(new IE('beforeinput', {
                bubbles: true,
                cancelable: true,
                inputType: 'deleteContentBackward'
            }));
            await sleep(60);
            selectRichEditorRange(editorEl);
            await sleep(120);
        }

        try {
            const DT = pageWin.DataTransfer || DataTransfer;
            const CE = pageWin.ClipboardEvent || ClipboardEvent;
            const dt = new DT();
            dt.setData('text/plain', normalizedText);

            const pasteEvt = new CE('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dt
            });
            editorEl.dispatchEvent(pasteEvt);
            await sleep(60);

            if (hasRichEditorContent(editorEl)) {
                editorEl.dispatchEvent(new Event('blur', { bubbles: true }));
                return;
            }

            // Dự phòng 2a: InputEvent beforeinput (insertFromPaste)
            const IE = pageWin.InputEvent || InputEvent;
            const beforeInputEvt = new IE('beforeinput', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertFromPaste',
                dataTransfer: dt
            });
            editorEl.dispatchEvent(beforeInputEvt);
            await sleep(60);

            if (hasRichEditorContent(editorEl)) {
                editorEl.dispatchEvent(new Event('blur', { bubbles: true }));
                return;
            }
        } catch (_) {}

        // Dự phòng 2b: Dùng execCommand('insertText') kích hoạt native Blink beforeinput theo từng dòng
        editorEl.focus();
        selectRichEditorRange(editorEl);
        await sleep(80);
        if (hadExisting) {
            document.execCommand('delete', false, null);
        }
        const lines = normalizedText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
                const IE = pageWin.InputEvent || InputEvent;
                const brk = new IE('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertParagraph' });
                const handled = !editorEl.dispatchEvent(brk);
                if (!handled) {
                    document.execCommand('insertParagraph', false, null);
                }
            }
            if (lines[i].length > 0) {
                document.execCommand('insertText', false, lines[i]);
            }
        }
        await sleep(40);
        editorEl.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    async function setFieldAnswer(element, value) {
        if (element.getAttribute('contenteditable') === 'true' || element.isContentEditable) {
            await setRichTextEditorValue(element, value);
        } else {
            setReactInputValue(element, value);
        }
    }

    // 2. Logic chính khi ấn trả lời
    const btn = document.getElementById('auto-answer-btn');
    btn.addEventListener('click', async () => {
        const apiKeys = getSavedApiKeys();
        if (apiKeys.length === 0) {
            openSettingsDialog();
            showSettingsMessage('Vui lòng thêm ít nhất 1 Gemini API Key và bấm "Lưu và đóng"!', 'warning');
            return;
        }

        let modelName = getSavedModel() || modelSelectEl.value;
        if (!modelName) {
            openSettingsDialog();
            showSettingsMessage('Chưa chọn model! Hãy bấm "↻ Lấy danh sách Model", chọn model rồi bấm "Lưu và đóng".', 'warning');
            return;
        }

        const questionContainers = document.querySelectorAll('[data-testid^="part-Submission_"]');
        if (questionContainers.length === 0) {
            alert('Không tìm thấy câu hỏi nào! Hãy chắc chắn bạn đang ở trang Quiz.');
            return;
        }

        const btnOriginalText = btn.innerText;
        btn.innerText = 'Đang nhờ AI giải...';
        btn.style.backgroundColor = '#f39c12';
        btn.disabled = true;

        try {
            const quizTitle = document.querySelector('[data-testid="header-left"] h1, [data-testid="cover-page-header-assignment-type"] + h1')?.innerText?.trim() || '';
            const imageCache = new Map();
            const imagesPayload = [];
            let imageCounter = 0;
            let questionsData = [];

            for (let index = 0; index < questionContainers.length; index++) {
                const container = questionContainers[index];
                const questionId = index + 1;
                const questionText = getCleanQuestionText(container);
                const options = getOptionElements(container);
                let optionsData = [];
                let optionItems = [];
                let questionType = 'single_choice';
                let inputCount = 0;
                let questionImageRefs = [];

                const promptImgs = Array.from(container.querySelectorAll('img')).filter(img =>
                    !img.closest('.rc-Option, label.cds-checkboxAndRadio-label, [data-testid="acknowledgment-checkpoint"], [data-assessment-checkpoint], [aria-hidden="true"]')
                );
                for (const img of promptImgs) {
                    const inlineData = await captureImageElement(img, imageCache);
                    if (inlineData) {
                        const imgRef = `IMAGE_${++imageCounter}`;
                        questionImageRefs.push(imgRef);
                        imagesPayload.push({
                            ref: imgRef,
                            questionId: questionId,
                            context: 'phần đề bài',
                            inlineData: inlineData
                        });
                    }
                }

                if (options.length > 0) {
                    const hasCheckbox = container.querySelector('input[type="checkbox"]') !== null;
                    questionType = hasCheckbox ? 'multiple_choice' : 'single_choice';

                    for (const option of options) {
                        const rawText = getOptionText(option);
                        const optImgs = Array.from(option.querySelectorAll('img:not([aria-hidden="true"])'));
                        const optImgRefs = [];

                        for (const img of optImgs) {
                            const inlineData = await captureImageElement(img, imageCache);
                            if (inlineData) {
                                const imgRef = `IMAGE_${++imageCounter}`;
                                optImgRefs.push(imgRef);
                            }
                        }

                        const label = optImgRefs.length > 0
                            ? (rawText ? `${rawText} [${optImgRefs.join(', ')}]` : `[${optImgRefs.join(', ')}]`)
                            : rawText;

                        if (optImgRefs.length > 0) {
                            for (let k = 0; k < optImgs.length; k++) {
                                const inlineData = await captureImageElement(optImgs[k], imageCache);
                                if (inlineData && optImgRefs[k]) {
                                    imagesPayload.push({
                                        ref: optImgRefs[k],
                                        questionId: questionId,
                                        context: `lựa chọn "${label}"`,
                                        inlineData: inlineData
                                    });
                                }
                            }
                        }

                        optionsData.push(label);
                        optionItems.push({ label, rawText, element: option });
                    }
                } else {
                    const textInputs = container.querySelectorAll(TEXT_INPUT_SELECTOR);
                    questionType = 'text';
                    inputCount = textInputs.length;
                }

                questionsData.push({
                    id: questionId,
                    type: questionType,
                    question: questionText,
                    imageRefs: questionImageRefs,
                    options: optionsData,
                    optionItems: optionItems,
                    inputCount: inputCount,
                    container: container
                });
            }

            // Tự động xoay vòng / chuyển sang API Key tiếp theo nếu key hiện tại hết quota (429) hoặc gặp lỗi
            const aiAnswersMap = await getAiAnswersWithFallback(apiKeys, modelName, questionsData, imagesPayload, quizTitle, (attemptIdx, total) => {
                btn.innerText = `Thử Key ${attemptIdx}/${total}...`;
            });
            
            // Điền đáp án tuần tự từng câu (quan trọng với Slate Rich Text Editor cần focus/selection riêng cho từng ô)
            for (const q of questionsData) {
                if (aiAnswersMap[q.id]) {
                    const aiCorrectOptions = aiAnswersMap[q.id];
                    
                    if (q.optionItems.length > 0) {
                        const normalizedCorrect = aiCorrectOptions.map(opt => String(opt).trim());
                        q.optionItems.forEach(optItem => {
                            const input = optItem.element.querySelector('input[type="radio"], input[type="checkbox"]');
                            
                            if (input) {
                                const shouldBeChecked = normalizedCorrect.includes(optItem.label) ||
                                    (optItem.rawText !== '' && normalizedCorrect.includes(optItem.rawText));
                                if (shouldBeChecked && !input.checked) {
                                    input.click();
                                } else if (!shouldBeChecked && input.checked && input.type === 'checkbox') {
                                    input.click();
                                }
                            }
                        });
                    } else {
                        const textInputs = q.container.querySelectorAll(TEXT_INPUT_SELECTOR);
                        if (textInputs.length > 0 && aiCorrectOptions.length > 0) {
                            for (let idx = 0; idx < textInputs.length; idx++) {
                                const answerText = aiCorrectOptions[idx] ?? aiCorrectOptions[0];
                                if (answerText !== undefined) {
                                    await setFieldAnswer(textInputs[idx], String(answerText));
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            alert('Lỗi khi gọi AI: ' + error.message);
            console.error(error);
        } finally {
            btn.innerText = btnOriginalText;
            btn.style.backgroundColor = '#0056D2';
            btn.disabled = false;
        }
    });

    async function getAiAnswersWithFallback(apiKeys, modelName, questionsData, imagesPayload, quizTitle, onRetry) {
        let lastError = null;
        const total = apiKeys.length;
        if (activeKeyIndex >= total) activeKeyIndex = 0;

        for (let attempt = 0; attempt < total; attempt++) {
            const idx = (activeKeyIndex + attempt) % total;
            const key = apiKeys[idx];
            if (attempt > 0 && typeof onRetry === 'function') {
                onRetry(attempt + 1, total);
            }
            try {
                const answers = await getAiAnswers(key, modelName, questionsData, imagesPayload, quizTitle);
                activeKeyIndex = idx; // Ghi nhớ key đang hoạt động tốt cho lần gọi sau
                return answers;
            } catch (err) {
                lastError = err;
                console.warn(`API Key #${idx + 1} thất bại (${err.message}). Đang chuyển sang key kế tiếp...`);
            }
        }
        throw lastError || new Error('Tất cả API Key đều thất bại.');
    }

    // 3. Hàm gọi AI (Gemini API - hỗ trợ cả văn bản và hình ảnh multimodal)
    function getAiAnswers(apiKey, modelName, questionsData, imagesPayload = [], quizTitle = '') {
        return new Promise((resolve, reject) => {
            const promptData = questionsData.map(q => {
                const item = {
                    id: q.id,
                    type: q.type,
                    question: q.question
                };
                if (q.imageRefs && q.imageRefs.length > 0) {
                    item.image_refs = q.imageRefs;
                }
                if (q.type === 'text') {
                    if (q.inputCount > 1) {
                        item.input_count = q.inputCount;
                    }
                } else {
                    item.options = q.options;
                }
                return item;
            });

            const imageNote = imagesPayload.length > 0
                ? '\n- Một số câu hỏi hoặc lựa chọn có đính kèm hình ảnh (được tham chiếu qua "image_refs" hoặc nhãn "[IMAGE_x]"). Hãy quan sát kỹ nội dung từng hình ảnh tương ứng được đính kèm bên dưới trước khi chọn/viết đáp án.'
                : '';

            const prompt = `Bạn là một chuyên gia giải bài tập${quizTitle ? ` cho bài "${quizTitle}"` : ''}. Dưới đây là danh sách các câu hỏi trong bài kiểm tra.
Hãy trả lời đúng định dạng JSON. Mảng JSON phải chứa các object có cấu trúc:
[
  {
    "id": 1,
    "correct_options": ["đáp án 1"]
  }
]
Quy tắc bắt buộc theo từng loại câu hỏi ("type"):
- "single_choice": Chọn ĐÚNG 1 đáp án đúng nhất. "correct_options" phải chứa CHÍNH XÁC nguyên văn chuỗi của lựa chọn đúng trong "options".
- "multiple_choice": Chọn tất cả các đáp án đúng (có thể nhiều hơn 1). "correct_options" phải chứa CHÍNH XÁC nguyên văn chuỗi của các lựa chọn đúng trong "options".
- "text": Câu hỏi tự luận, bài viết (essay), phản hồi ngắn hoặc điền từ/số. Hãy tự viết câu trả lời trực tiếp, tự nhiên, đúng trọng tâm, tuân thủ yêu cầu độ dài/cấu trúc trong đề bài (ví dụ: 1-2 câu, từ/số ngắn gọn, hoặc chia nhiều đoạn văn cách nhau bằng ký tự xuống dòng "\\n\\n" nếu đề yêu cầu viết nhiều đoạn/essay), dùng ĐÚNG ngôn ngữ của câu hỏi (ví dụ câu hỏi tiếng Anh thì trả lời bằng tiếng Anh), tuyệt đối không dùng ký hiệu markdown như **, #, \`\`\`, và đặt vào mảng "correct_options" (nếu có "input_count" > 1 thì trả về đủ số phần tử tương ứng với từng ô nhập).${imageNote}

Dữ liệu câu hỏi:
${JSON.stringify(promptData, null, 2)}`;

            const contentParts = [{ text: prompt }];
            imagesPayload.forEach(img => {
                contentParts.push({
                    text: `\nHình ảnh [${img.ref}] (thuộc câu hỏi id=${img.questionId}, ${img.context}):`
                });
                contentParts.push({
                    inline_data: img.inlineData
                });
            });

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const body = JSON.stringify({
                contents: [{ parts: contentParts }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            });

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: {
                    "Content-Type": "application/json"
                },
                data: body,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const resJson = JSON.parse(response.responseText);
                            const parts = resJson.candidates?.[0]?.content?.parts || [];
                            const textPart = parts.find(p => !p.thought && typeof p.text === 'string') || parts[0];
                            const textOutput = (textPart?.text || '')
                                .replace(/^```(?:json)?\s*/i, '')
                                .replace(/\s*```$/i, '')
                                .trim();
                            const parsed = JSON.parse(textOutput);
                            const aiResultArray = Array.isArray(parsed) ? parsed : (parsed.answers || parsed.questions || []);
                            
                            let resultMap = {};
                            aiResultArray.forEach(item => {
                                if (Array.isArray(item.correct_options)) {
                                    resultMap[item.id] = item.correct_options;
                                } else if (typeof item.correct_options === 'string') {
                                    resultMap[item.id] = [item.correct_options];
                                } else {
                                    resultMap[item.id] = [];
                                }
                            });
                            resolve(resultMap);
                        } catch (e) {
                            reject(new Error("Không thể parse kết quả từ AI."));
                        }
                    } else {
                        let detail = response.statusText || '';
                        try {
                            const errJson = JSON.parse(response.responseText);
                            if (errJson?.error?.message) detail = errJson.error.message;
                        } catch (_) {}
                        reject(new Error(`API Error: ${response.status}${detail ? ' - ' + detail : ''}`));
                    }
                },
                onerror: function(err) {
                    reject(new Error("Lỗi kết nối mạng khi gọi API."));
                }
            });
        });
    }

})();
