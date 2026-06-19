// ==UserScript==
// @name         Quiz Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Tự động giải và điền đáp án bài kiểm tra bằng AI.
// @author       You
// @match        *://*.coursera.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    // 1. UI Khung chính
    const mainUI = document.createElement('div');
    mainUI.style.position = 'fixed';
    mainUI.style.top = '20px';
    mainUI.style.right = '20px';
    mainUI.style.zIndex = 10000;
    mainUI.style.display = 'flex';
    mainUI.style.flexDirection = 'column';
    mainUI.style.alignItems = 'flex-end';
    document.body.appendChild(mainUI);

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

    // Box Cài đặt AI & Nút giải bài
    const setupUI = document.createElement('div');
    setupUI.style.padding = '15px';
    setupUI.style.backgroundColor = '#f9f9f9';
    setupUI.style.border = '1px solid #ccc';
    setupUI.style.borderRadius = '8px';
    setupUI.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    setupUI.style.width = '250px';
    setupUI.style.fontFamily = 'sans-serif';
    setupUI.style.display = 'none'; // Ẩn mặc định
    setupUI.innerHTML = `
        <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Cài đặt AI (Gemini)</h3>
        <label style="font-size: 12px; display: block; margin-bottom: 5px;">API Key:</label>
        <input type="password" id="gemini-api-key" style="width: 100%; box-sizing: border-box; padding: 5px; margin-bottom: 10px;" placeholder="Nhập Gemini API Key">
        
        <label style="font-size: 12px; display: block; margin-bottom: 5px;">Model:</label>
        <input type="text" id="gemini-model-name" style="width: 100%; box-sizing: border-box; padding: 5px; margin-bottom: 10px;" placeholder="gemini-1.5-flash" value="gemini-1.5-flash">
        
        <button id="save-ai-settings" style="width: 100%; padding: 8px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Lưu thiết lập</button>
        <div id="ai-settings-msg" style="font-size: 12px; color: green; text-align: center; display: none; margin-bottom: 10px;">Đã lưu!</div>
        <button id="auto-answer-btn" style="width: 100%; padding: 10px; background-color: #0056D2; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Trả lời</button>
    `;
    mainUI.appendChild(setupUI);

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
        
        // Đảm bảo khi kéo thả không bị chui ra ngoài màn hình
        const rect = mainUI.getBoundingClientRect();
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + rect.width > window.innerWidth) newLeft = window.innerWidth - rect.width;
        if (newTop + rect.height > window.innerHeight) newTop = window.innerHeight - rect.height;

        mainUI.style.left = `${newLeft}px`;
        mainUI.style.top = `${newTop}px`;
        mainUI.style.right = 'auto'; // Hủy căn lề phải khi di chuyển
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Thu nhỏ/Phóng to khi click (nếu không phải là drag)
    toggleBtn.addEventListener('click', () => {
        if (!hasDragged) {
            const isHidden = setupUI.style.display === 'none';
            setupUI.style.display = isHidden ? 'block' : 'none';
            
            // Nếu vừa mở rộng, kiểm tra xem có bị tràn viền màn hình không
            if (isHidden) {
                // Đợi 1 chút để DOM cập nhật kích thước thật
                setTimeout(() => {
                    const rect = mainUI.getBoundingClientRect();
                    let currentLeft = rect.left;
                    let currentTop = rect.top;
                    let needsAdjust = false;

                    // Kiểm tra viền phải
                    if (rect.right > window.innerWidth) {
                        currentLeft -= (rect.right - window.innerWidth + 15);
                        needsAdjust = true;
                    }
                    // Kiểm tra viền dưới
                    if (rect.bottom > window.innerHeight) {
                        currentTop -= (rect.bottom - window.innerHeight + 15);
                        needsAdjust = true;
                    }
                    // Kiểm tra viền trái
                    if (currentLeft < 0) {
                        currentLeft = 15;
                        needsAdjust = true;
                    }
                    // Kiểm tra viền trên
                    if (currentTop < 0) {
                        currentTop = 15;
                        needsAdjust = true;
                    }

                    if (needsAdjust) {
                        mainUI.style.left = `${currentLeft}px`;
                        mainUI.style.top = `${currentTop}px`;
                        mainUI.style.right = 'auto'; // Hủy căn lề phải để dùng left
                    }
                }, 0);
            }
        }
    });

    // Load cài đặt đã lưu
    const apiKeyInput = document.getElementById('gemini-api-key');
    const modelInput = document.getElementById('gemini-model-name');
    apiKeyInput.value = GM_getValue('geminiApiKey', '');
    modelInput.value = GM_getValue('geminiModelName', 'gemini-1.5-flash');

    // Lưu thiết lập
    document.getElementById('save-ai-settings').addEventListener('click', () => {
        GM_setValue('geminiApiKey', apiKeyInput.value.trim());
        GM_setValue('geminiModelName', modelInput.value.trim() || 'gemini-1.5-flash');
        const msg = document.getElementById('ai-settings-msg');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 2000);
    });

    // 2. Logic chính khi ấn trả lời
    const btn = document.getElementById('auto-answer-btn');
    btn.addEventListener('click', async () => {
        const apiKey = GM_getValue('geminiApiKey', '');
        const modelName = GM_getValue('geminiModelName', 'gemini-1.5-flash');
        
        if (!apiKey) {
            alert('Vui lòng nhập Gemini API Key trong phần Cài đặt AI!');
            return;
        }

        const questionContainers = document.querySelectorAll('[data-testid^="part-Submission_"]');
        if (questionContainers.length === 0) {
            alert('Không tìm thấy câu hỏi nào! Hãy chắc chắn bạn đang ở trang Quiz.');
            return;
        }

        const btnOriginalText = btn.innerText;
        let questionsData = [];

        // Thu thập dữ liệu từ trang
        questionContainers.forEach((container, index) => {
            const promptNode = container.querySelector('[id^="prompt-"]');
            const questionText = promptNode ? promptNode.innerText.trim() : 'Không tìm thấy nội dung câu hỏi';
            
            const options = container.querySelectorAll('.rc-Option');
            let optionsData = [];

            if (options.length > 0) {
                options.forEach((option) => {
                    const optionTextNode = option.querySelector('.cds-checkboxAndRadio-labelText, .rc-CML');
                    const text = optionTextNode ? optionTextNode.innerText.trim() : option.innerText.trim();
                    optionsData.push(text);
                });
            } else {
                const textInputs = container.querySelectorAll('input[type="text"], textarea');
                textInputs.forEach(input => {
                    optionsData.push('Text Input');
                });
            }

            questionsData.push({
                id: index + 1,
                question: questionText,
                options: optionsData,
                container: container
            });
        });

        btn.innerText = 'Đang nhờ AI giải...';
        btn.style.backgroundColor = '#f39c12';
        btn.disabled = true;

        try {
            const aiAnswersMap = await getAiAnswers(apiKey, modelName, questionsData);
            
            // Tự động điền đáp án từ AI vào trang web
            questionsData.forEach(q => {
                if (aiAnswersMap[q.id]) {
                    const aiCorrectOptions = aiAnswersMap[q.id];
                    const options = q.container.querySelectorAll('.rc-Option');
                    
                    if (options.length > 0) {
                        options.forEach(option => {
                            const optionTextNode = option.querySelector('.cds-checkboxAndRadio-labelText, .rc-CML');
                            const text = optionTextNode ? optionTextNode.innerText.trim() : option.innerText.trim();
                            const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                            
                            if (input) {
                                const shouldBeChecked = aiCorrectOptions.includes(text);
                                if (shouldBeChecked && !input.checked) {
                                    input.click(); // Chọn đáp án đúng
                                } else if (!shouldBeChecked && input.checked && input.type === 'checkbox') {
                                    input.click(); // Bỏ chọn đáp án sai (nếu là checkbox)
                                }
                            }
                        });
                    } else {
                        const textInputs = q.container.querySelectorAll('input[type="text"], textarea');
                        if (textInputs.length > 0 && aiCorrectOptions.length > 0) {
                            textInputs.forEach(input => {
                                input.value = aiCorrectOptions[0];
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            });
                        }
                    }
                }
            });
        } catch (error) {
            alert('Lỗi khi gọi AI: ' + error.message);
            console.error(error);
        }

        btn.innerText = btnOriginalText;
        btn.style.backgroundColor = '#0056D2';
        btn.disabled = false;
    });

    // 3. Hàm gọi AI (Gemini API)
    function getAiAnswers(apiKey, modelName, questionsData) {
        return new Promise((resolve, reject) => {
            const promptData = questionsData.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options
            }));

            const prompt = `Bạn là một chuyên gia giải bài tập. Dưới đây là danh sách các câu hỏi trắc nghiệm.
Hãy trả lời đúng định dạng JSON. Mảng JSON phải chứa các object có cấu trúc:
[
  {
    "id": 1,
    "correct_options": ["đáp án đúng 1", "đáp án đúng 2"]
  }
]
Chú ý: correct_options phải chứa CHÍNH XÁC text của các lựa chọn đúng. Có thể có nhiều hơn 1 lựa chọn đúng trong câu hỏi nhiều lựa chọn.

Dữ liệu câu hỏi:
${JSON.stringify(promptData, null, 2)}`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const body = JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
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
                            const textOutput = resJson.candidates[0].content.parts[0].text;
                            const aiResultArray = JSON.parse(textOutput);
                            
                            let resultMap = {};
                            aiResultArray.forEach(item => {
                                resultMap[item.id] = item.correct_options || [];
                            });
                            resolve(resultMap);
                        } catch (e) {
                            reject(new Error("Không thể parse kết quả từ AI."));
                        }
                    } else {
                        reject(new Error(`API Error: ${response.status} - ${response.statusText}`));
                    }
                },
                onerror: function(err) {
                    reject(new Error("Lỗi kết nối mạng khi gọi API."));
                }
            });
        });
    }

})();
