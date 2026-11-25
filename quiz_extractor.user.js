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
// ==/UserScript==

(function() {
    'use strict';

    const pageWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Ngăn Coursera chặn phím, cướp focus (Focus Trap) hay sự kiện chuột khi đang gõ vào ô nhập API/Model
    ['focusin', 'focusout', 'focus', 'blur', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'keypress', 'input', 'paste'].forEach(evt => {
        setupUI.addEventListener(evt, (e) => {
            e.stopPropagation();
        });
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

    // --- Các hàm trích xuất câu hỏi, hình ảnh và điền đáp án (hỗ trợ cả <textarea>, <input> và Slate RichTextEditor) ---
    const TEXT_INPUT_SELECTOR = [
        'textarea:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        'input[type="text"]:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        'input[type="number"]:not([readonly]):not([aria-hidden="true"]):not([disabled])',
        '[data-slate-editor="true"][contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]:not([aria-hidden="true"])'
    ].join(', ');

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
        btn.innerText = 'Đang nhờ AI giải...';
        btn.style.backgroundColor = '#f39c12';
        btn.disabled = true;

        try {
            const quizTitle = document.querySelector('[data-testid="header-left"] h1, [data-testid="cover-page-header-assignment-type"] + h1')?.innerText?.trim() || '';
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

                if (options.length > 0) {
                    const hasCheckbox = container.querySelector('input[type="checkbox"]') !== null;
                    questionType = hasCheckbox ? 'multiple_choice' : 'single_choice';
                    for (const option of options) {
                        const rawText = getOptionText(option);
                        optionsData.push(rawText);
                        optionItems.push({ label: rawText, rawText, element: option });
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
                    options: optionsData,
                    optionItems: optionItems,
                    inputCount: inputCount,
                    container: container
                });
            }

            const aiAnswersMap = await getAiAnswers(apiKey, modelName, questionsData, quizTitle);
            
            for (const q of questionsData) {
                if (aiAnswersMap[q.id]) {
                    const aiCorrectOptions = aiAnswersMap[q.id];
                    
                    if (q.optionItems.length > 0) {
                        const normalizedCorrect = aiCorrectOptions.map(opt => String(opt).trim());
                        q.optionItems.forEach(optItem => {
                            const input = optItem.element.querySelector('input[type="radio"], input[type="checkbox"]');
                            if (input) {
                                const shouldBeChecked = normalizedCorrect.includes(optItem.label);
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

    // 3. Hàm gọi AI (Gemini API)
    function getAiAnswers(apiKey, modelName, questionsData, quizTitle = '') {
        return new Promise((resolve, reject) => {
            const promptData = questionsData.map(q => {
                const item = { id: q.id, type: q.type, question: q.question };
                if (q.type === 'text') {
                    if (q.inputCount > 1) item.input_count = q.inputCount;
                } else {
                    item.options = q.options;
                }
                return item;
            });

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
- "text": Câu hỏi tự luận, bài viết (essay), phản hồi ngắn hoặc điền từ/số. Hãy tự viết câu trả lời trực tiếp, tự nhiên, đúng trọng tâm, tuân thủ yêu cầu độ dài/cấu trúc trong đề bài (ví dụ: 1-2 câu, từ/số ngắn gọn, hoặc chia nhiều đoạn văn cách nhau bằng ký tự xuống dòng "\\n\\n" nếu đề yêu cầu viết nhiều đoạn/essay), dùng ĐÚNG ngôn ngữ của câu hỏi (ví dụ câu hỏi tiếng Anh thì trả lời bằng tiếng Anh), tuyệt đối không dùng ký hiệu markdown như **, #, \`\`\`, và đặt vào mảng "correct_options" (nếu có "input_count" > 1 thì trả về đủ số phần tử tương ứng với từng ô nhập).

Dữ liệu câu hỏi:
${JSON.stringify(promptData, null, 2)}`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const body = JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            });

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: { "Content-Type": "application/json" },
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
                onerror: function() {
                    reject(new Error("Lỗi kết nối mạng khi gọi API."));
                }
            });
        });
    }

})();
