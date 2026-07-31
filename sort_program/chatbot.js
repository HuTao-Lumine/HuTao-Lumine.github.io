document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("ai-chatbot-toggle");
    const windowEl = document.getElementById("ai-chatbot-window");
    const closeBtn = document.getElementById("chatbot-close-btn");
    const exportBtn = document.getElementById("chatbot-export-btn");
    const settingsBtn = document.getElementById("chatbot-settings-btn");
    const settingsContainer = document.getElementById("api-settings-container");
    const saveBtn = document.getElementById("api-save-btn");
    
    const sendBtn = document.getElementById("chatbot-send-btn");
    const inputEl = document.getElementById("chatbot-input");
    const messagesContainer = document.getElementById("chatbot-messages");
    
    const apiKeyFileInput = document.getElementById("api-key-file-input");
    const apiKeyStatus = document.getElementById("api-key-status");
    const apiModelInput = document.getElementById("api-model-input");

    let chatHistory = []; 
    let currentKeyIndex = 0;
    let apiKeysList = [];
    
    // Load settings from localStorage
    const savedKeysData = localStorage.getItem("geminiApiKeysList");
    const savedModel = localStorage.getItem("geminiModel");
    
    if (savedKeysData) {
        try {
            apiKeysList = JSON.parse(savedKeysData);
            apiKeyStatus.innerText = `Đã nạp ${apiKeysList.length} Keys từ hệ thống.`;
            apiKeyStatus.style.color = "#4ade80";
        } catch (e) {
            console.error(e);
        }
    }
    if (savedModel) apiModelInput.value = savedModel;

    // Toggle window
    toggleBtn.addEventListener("click", () => {
        windowEl.classList.toggle("hidden");
        if (!windowEl.classList.contains("hidden")) {
            inputEl.focus();
            if (window.innerWidth <= 480) {
                windowEl.style.right = "0px";
            }
        }
    });

    closeBtn.addEventListener("click", () => {
        windowEl.classList.add("hidden");
    });
    
    settingsBtn.addEventListener("click", () => {
        if (settingsContainer.style.display === "none") {
            settingsContainer.style.display = "block";
        } else {
            settingsContainer.style.display = "none";
        }
    });

    saveBtn.addEventListener("click", () => {
        const model = apiModelInput.value.trim();
        localStorage.setItem("geminiModel", model || "gemini-1.5-flash");
        
        if (apiKeyFileInput.files.length > 0) {
            const file = apiKeyFileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const lines = content.split("\n");
                const extractedKeys = [];
                
                lines.forEach(line => {
                    line = line.trim();
                    if (line && line.includes("=")) {
                        const parts = line.split("=");
                        if (parts.length >= 2) {
                            const val = parts.slice(1).join("=").trim();
                            if (val) extractedKeys.push(val);
                        }
                    }
                });
                
                if (extractedKeys.length > 0) {
                    apiKeysList = extractedKeys;
                    currentKeyIndex = 0;
                    localStorage.setItem("geminiApiKeysList", JSON.stringify(apiKeysList));
                    apiKeyStatus.innerText = `Đã nạp thành công ${apiKeysList.length} Keys!`;
                    apiKeyStatus.style.color = "#4ade80";
                    alert(`Đã nạp ${apiKeysList.length} API Keys thành công!`);
                    settingsContainer.style.display = "none";
                } else {
                    alert("Không tìm thấy Key nào hợp lệ trong file. Vui lòng kiểm tra định dạng TÊN=GIÁ_TRỊ.");
                }
            };
            reader.readAsText(file);
        } else {
            if (apiKeysList.length > 0) {
                alert("Đã lưu cấu hình Model thành công!");
                settingsContainer.style.display = "none";
            } else {
                alert("Vui lòng tải lên File chứa API Key.");
            }
        }
    });

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            let logText = "--- BẮT ĐẦU LOG CHAT ---\n\n";
            const msgs = messagesContainer.querySelectorAll('.chat-message');
            msgs.forEach(msg => {
                const isBot = msg.classList.contains('bot-message');
                const role = isBot ? "AI Thủ thư:" : "User:";
                const contentEl = msg.querySelector('.msg-content');
                if (contentEl && !contentEl.classList.contains('typing-indicator')) {
                    logText += role + "\n" + contentEl.innerText.trim() + "\n\n";
                }
            });
            logText += "--- KẾT THÚC LOG CHAT ---";
            
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chat_log_' + new Date().toISOString().slice(0, 10) + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // --- AGENTIC AI TOOLS (FUNCTION CALLING) ---
    const geminiTools = [{
        functionDeclarations: [
            {
                name: "get_pal_details",
                description: "Lấy TOÀN BỘ thông tin chi tiết của một con Pal bằng Tên (Bao gồm: Máu, tấn công, phòng thủ, tốc độ chạy/cưỡi, thể lực, tỷ lệ giới tính, kích thước, lượng thức ăn, hệ, công việc, vật phẩm rơi, và TOÀN BỘ chi tiết Kỹ năng đặc trưng / Partner Skill).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        pal_name: { type: "STRING", description: "Tên của Pal cần xem chi tiết (vd: Jetragon, Braloha, Anubis...)" }
                    },
                    required: ["pal_name"]
                }
            },
            {
                name: "advanced_search_pals",
                description: "Bộ lọc đa năng tìm kiếm hàng loạt Pal. Có thể kết hợp nhiều điều kiện (Hệ, Công việc, Kích cỡ, Độ hiếm, Vật phẩm rơi, Từ khóa Kỹ năng Đồng hành) và Sắp xếp kết quả.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        element: { type: "STRING", description: "Hệ (Fire, Water, Dark, Grass, Electric, Ice, Dragon, Ground, Neutral)" },
                        work_type: { type: "STRING", description: "Công việc (handiwork, mining, planting, transporting, gathering, lumbering, medicineproduction, cooling, generatingelectricity, kindling, farming)" },
                        size: { type: "STRING", description: "Kích thước (XS, S, M, L, XL)" },
                        rarity: { type: "INTEGER", description: "Độ hiếm (1 đến 10)" },
                        drop_item: { type: "STRING", description: "Tên vật phẩm rơi (vd: Leather, Bone...)" },
                        partner_skill_keyword: { type: "STRING", description: "Từ khóa trong Kỹ năng đồng hành (vd: breed, egg, ride, fly, ore...)" },
                        sort_by: { type: "STRING", description: "Sắp xếp theo chỉ số (hp, attack, defense, sprint_speed, work_speed, price, food_amount, stamina, male_prob)" },
                        sort_order: { type: "STRING", description: "Thứ tự: 'desc' (cao xuống thấp) hoặc 'asc' (thấp lên cao)" },
                        limit: { type: "INTEGER", description: "Số lượng kết quả (Mặc định 5)" }
                    }
                }
            },
            {
                name: "search_passive_skill",
                description: "Tìm kiếm thông tin và công dụng của một Kỹ năng bị động (Passive Skill).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        skill_name: { type: "STRING", description: "Tên kỹ năng bị động (vd: Artisan, Legend, Thần tốc...)" }
                    },
                    required: ["skill_name"]
                }
            }
        ]
    }];

    // --- TOOL EXECUTION LOGIC ---
    function executeTool(name, args) {
        const pals = typeof allPals !== 'undefined' ? allPals : (window.allPals || []);
        const passives = typeof PASSIVES_DATA !== 'undefined' ? PASSIVES_DATA : (window.PASSIVES_DATA || []);
        
        if (name === "get_pal_details") {
            const pal = pals.find(p => p.name.toLowerCase().includes(args.pal_name.toLowerCase()));
            return pal ? pal : { error: "Không tìm thấy Pal có tên này." };
        }
        
        if (name === "advanced_search_pals") {
            let filtered = [...pals];
            
            if (args.element) {
                filtered = filtered.filter(p => p.elements && p.elements.map(e=>e.toLowerCase()).includes(args.element.toLowerCase()));
            }
            if (args.work_type) {
                filtered = filtered.filter(p => p.work_suitability && Object.keys(p.work_suitability).some(k => k.toLowerCase().includes(args.work_type.toLowerCase())));
            }
            if (args.size) {
                filtered = filtered.filter(p => p.stats?.size?.toLowerCase() === args.size.toLowerCase());
            }
            if (args.rarity) {
                filtered = filtered.filter(p => p.stats?.rarity === parseInt(args.rarity));
            }
            if (args.drop_item) {
                const item = args.drop_item.toLowerCase();
                filtered = filtered.filter(p => p.drops && p.drops.some(d => (d.name || "").toLowerCase().includes(item)));
            }
            if (args.partner_skill_keyword) {
                const keyword = args.partner_skill_keyword.toLowerCase();
                filtered = filtered.filter(p => {
                    if (!p.partner_skill) return false;
                    const psName = (p.partner_skill.name || "").toLowerCase();
                    const psDesc = (p.partner_skill.description || "").toLowerCase();
                    return psName.includes(keyword) || psDesc.includes(keyword);
                });
            }
            
            if (args.sort_by) {
                filtered.sort((a, b) => {
                    let valA = 0, valB = 0;
                    if (args.sort_by === "hp") { valA = a.stats?.hp||0; valB = b.stats?.hp||0; }
                    else if (args.sort_by === "attack") { valA = a.stats?.attack||0; valB = b.stats?.attack||0; }
                    else if (args.sort_by === "defense") { valA = a.stats?.defense||0; valB = b.stats?.defense||0; }
                    else if (args.sort_by === "sprint_speed") { valA = a.stats?.sprint_speed || a.mount_speed?.sprint_speed || 0; valB = b.stats?.sprint_speed || b.mount_speed?.sprint_speed || 0; }
                    else if (args.sort_by === "price") { valA = a.stats?.price||0; valB = b.stats?.price||0; }
                    else if (args.sort_by === "food_amount") { valA = a.stats?.food_amount||0; valB = b.stats?.food_amount||0; }
                    else if (args.sort_by === "stamina") { valA = a.stats?.stamina || a.mount_speed?.stamina || 0; valB = b.stats?.stamina || b.mount_speed?.stamina || 0; }
                    else if (args.sort_by === "male_prob") { valA = a.stats?.male_prob||0; valB = b.stats?.male_prob||0; }
                    else if (args.sort_by === "work_speed") {
                        valA = Math.max(...Object.values(a.work_suitability||{}), 0);
                        valB = Math.max(...Object.values(b.work_suitability||{}), 0);
                    }
                    return args.sort_order === "asc" ? valA - valB : valB - valA;
                });
            }
            
            let limit = args.limit || 5;
            filtered = filtered.slice(0, limit);
            
            // Lược bỏ bớt json trả về để tránh tốn token
            return filtered.map(p => ({
                name: p.name,
                elements: p.elements,
                stats_summary: { hp: p.stats?.hp, attack: p.stats?.attack, defense: p.stats?.defense, sprint_speed: p.stats?.sprint_speed },
                work_suitability: p.work_suitability,
                partner_skill_name: p.partner_skill?.name,
                partner_skill_desc: p.partner_skill?.description
            }));
        }
        
        if (name === "search_passive_skill") {
            const skill = args.skill_name.toLowerCase();
            const matched = passives.filter(p => (p.name_vi||p.name).toLowerCase().includes(skill) || (p.name_en||p.name).toLowerCase().includes(skill));
            return matched.slice(0, 3).map(p => ({ name: p.name, tier: p.tier, description: p.desc_vi || p.desc }));
        }
        
        return { error: "Không tìm thấy công cụ này." };
    }

    const handleSend = async () => {
        const text = inputEl.value.trim();
        if (!text) return;
        
        const modelName = localStorage.getItem("geminiModel") || "gemini-1.5-flash";
        
        if (!apiKeysList || apiKeysList.length === 0) {
            alert("Vui lòng mở Cài đặt (⚙️) và Tải lên File chứa API Keys trước khi chat!");
            settingsContainer.style.display = "block";
            return;
        }
        
        addMessage(text, "user");
        inputEl.value = "";
        inputEl.disabled = true;
        sendBtn.disabled = true;

        chatHistory.push({ role: "user", parts: [{ text: text }] });
        
        const { id: msgId, contentDiv } = addStreamingMessageContainer("bot");

        await callGeminiAPI(modelName, contentDiv);
        
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
    };
    
    async function callGeminiAPI(modelName, contentDiv) {
        if (currentKeyIndex >= apiKeysList.length) {
            contentDiv.innerHTML += `<br><span style="color:#ef4444;">Lỗi: Đã dùng hết toàn bộ ${apiKeysList.length} API Keys trong danh sách. Tất cả đều báo lỗi quá tải hoặc hết hạn. Vui lòng tải lên file Key mới!</span>`;
            return;
        }

        const apiKey = apiKeysList[currentKeyIndex];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
        
        const requestBody = {
            contents: chatHistory,
            systemInstruction: {
                parts: [{ text: "Bạn là Trợ lý AI thủ thư chuyên nghiệp của Palworld Smart Paldex. Nếu người dùng hỏi thông tin cụ thể (chỉ số Pal, vật phẩm rơi, kỹ năng), HÃY GỌI FUNCTION tương ứng để lấy Data chính xác. KHÔNG ĐƯỢC TỰ BỊA DATA. Sau khi gọi function và có kết quả trả về, hãy tổng hợp lại và giải thích cho người dùng bằng Tiếng Việt một cách tự nhiên, ngắn gọn và chính xác." }]
            },
            tools: geminiTools,
            generationConfig: { temperature: 0.2 }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                const errMsg = errJson.error?.message || "";
                
                // Cơ chế tự động xoay vòng Key (Key Rotation) khi gặp lỗi
                const isOverloaded = response.status === 429 || response.status === 503 || errMsg.toLowerCase().includes("high demand") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted");
                if (isOverloaded) {
                    console.warn(`Key index ${currentKeyIndex} failed (${response.status}). Switching to next key...`);
                    currentKeyIndex++;
                    contentDiv.innerHTML += `<br><em style="color:#fbbf24; font-size:0.8rem;">(Key quá tải, đang tự động đổi sang Key dự phòng: ${currentKeyIndex + 1}/${apiKeysList.length})...</em><br>`;
                    return await callGeminiAPI(modelName, contentDiv); // Đệ quy gọi lại bằng Key mới
                }
                
                throw new Error(errMsg || `Lỗi HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullReply = "";
            let functionCallToExecute = null;
            let modelFunctionContent = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.substring(6).trim();
                        if (dataStr === "[DONE]") continue;
                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.candidates?.[0]?.content;
                            
                            if (content && content.parts) {
                                // 1. Handle Function Call Request from AI
                                const fnPart = content.parts.find(p => p.functionCall);
                                if (fnPart) {
                                    modelFunctionContent = content; // Lưu lại nguyên gốc cấu trúc JSON của Model
                                    functionCallToExecute = fnPart.functionCall;
                                    break; // Break lines loop
                                }
                                
                                // 2. Handle standard Text Streaming
                                const txtPart = content.parts.find(p => p.text);
                                if (txtPart) {
                                    fullReply += txtPart.text;
                                    contentDiv.innerHTML = fullReply
                                        .replace(/\n/g, "<br>")
                                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            }
                        } catch (e) {
                            // ignore parse error
                        }
                    }
                }
                
                // If a function call was detected, break the streaming loop to execute it
                if (functionCallToExecute) break;
            }

            // 3. Execute the Function if AI requested it
            if (functionCallToExecute) {
                contentDiv.innerHTML += `<br><em>Đang tra cứu cơ sở dữ liệu (${functionCallToExecute.name})...</em><br>`;
                
                // Append AI's EXACT function call request to history (tránh lỗi thiếu thought_signature)
                if (modelFunctionContent) {
                    modelFunctionContent.role = "model"; // Bắt buộc phải có role: "model" nếu Gemini API quên trả về
                    chatHistory.push(modelFunctionContent);
                } else {
                    chatHistory.push({
                        role: "model",
                        parts: [{ functionCall: functionCallToExecute }]
                    });
                }
                
                // Run our JS Function
                const resultData = executeTool(functionCallToExecute.name, functionCallToExecute.args);
                
                // Append our Function Response to history
                chatHistory.push({
                    role: "function",
                    parts: [{
                        functionResponse: {
                            name: functionCallToExecute.name,
                            response: { result: resultData }
                        }
                    }]
                });
                
                // 4. Call API AGAIN with the new history to get the final text answer
                await callGeminiAPI(modelName, contentDiv);
            } 
            else if (fullReply) {
                // If no function call, just save the final text to history
                chatHistory.push({ role: "model", parts: [{ text: fullReply }] });
                
                // Xóa bỏ logic tự động cắt Lịch sử Chat (splice) vì nó cắt nhầm bộ đôi User/Model gây ra lỗi Sequence.
                // Trình duyệt hiện tại dư sức lưu trữ hàng ngàn tin nhắn văn bản.
            }

        } catch (err) {
            console.error(err);
            contentDiv.innerHTML = `<span style="color:#ef4444;">Lỗi: ${err.message}</span>`;
        }
    }

    sendBtn.addEventListener("click", handleSend);
    inputEl.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSend();
    });

    function addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${sender}-message`;
        
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "msg-avatar";
        avatarDiv.innerHTML = sender === "bot" ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "msg-content";
        contentDiv.innerHTML = text;
        
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addStreamingMessageContainer(sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${sender}-message`;
        
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "msg-avatar";
        avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "msg-content";
        contentDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return { id: "msg-" + Date.now(), contentDiv: contentDiv };
    }
});
