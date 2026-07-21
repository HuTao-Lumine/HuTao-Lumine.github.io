/* ==========================================================================
   PALWORLD SMART PALDEX - LOGIC XỬ LÝ LỌC & SẮP XẾP (JAVASCRIPT)
   ========================================================================== */

// Biến lưu trữ toàn bộ dữ liệu Pal (299 Pal)
let allPals = [];

// Cấu hình trạng thái bộ lọc hiện tại (Filter State)
let filterState = {
    search: "",
    elements: ["all"],        // "all" hoặc danh sách hệ đã chọn ["fire", "dragon"...]
    elementLogic: "OR",       // "OR" (Hoặc) / "AND" (Và)
    works: [],                // Danh sách kỹ năng làm việc đã chọn ["kindling"...]
    workSortOrder: "desc",    // Sắp xếp cấp độ làm việc: "desc" (Cao->Thấp), "asc" (Thấp->Cao), "none"
    mountOnly: false,         // Chỉ hiện Pal có tốc độ cưỡi
    sortBy: "id-asc"          // Tiêu chí sắp xếp mặc định
};

// Từ điển icon & tên tiếng Việt cho Hệ (Element)
const ELEMENT_INFO = {
    neutral: { name: "Neutral", icon: "fa-circle-dot", color: "#9ca3af", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_00.webp" },
    fire: { name: "Fire", icon: "fa-fire", color: "#f97316", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_01.webp" },
    water: { name: "Water", icon: "fa-droplet", color: "#38bdf8", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_02.webp" },
    electric: { name: "Electric", icon: "fa-bolt", color: "#eab308", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_03.webp" },
    grass: { name: "Grass", icon: "fa-leaf", color: "#22c55e", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_04.webp" },
    ice: { name: "Ice", icon: "fa-snowflake", color: "#67e8f9", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_08.webp" },
    ground: { name: "Ground", icon: "fa-mountain", color: "#b45309", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_07.webp" },
    dark: { name: "Dark", icon: "fa-moon", color: "#a855f7", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_05.webp" },
    dragon: { name: "Dragon", icon: "fa-dragon", color: "#ec4899", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_Icon_element_s_06.webp" }
};

// Từ điển icon & tên tiếng Việt cho Kỹ năng làm việc (Work Suitability)
const WORK_INFO = {
    "kindling": { name: "Nhóm lửa", icon: "fa-fire-flame-simple", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_00.webp" },
    "watering": { name: "Tưới nước", icon: "fa-water", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_01.webp" },
    "planting": { name: "Gieo hạt", icon: "fa-seedling", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_02.webp" },
    "generating electricity": { name: "Phát điện", icon: "fa-plug", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_03.webp" },
    "handiwork": { name: "Thủ công", icon: "fa-hand-holding", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_04.webp" },
    "gathering": { name: "Thu thập", icon: "fa-basket-shopping", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_05.webp" },
    "lumbering": { name: "Chặt cây", icon: "fa-tree", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_06.webp" },
    "mining": { name: "Khai khoáng", icon: "fa-pickaxe", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_07.webp" },
    "medicine production": { name: "Chế thuốc", icon: "fa-flask", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_08.webp" },
    "cooling": { name: "Làm lạnh", icon: "fa-icicles", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_10.webp" },
    "transporting": { name: "Vận chuyển", icon: "fa-box-archive", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_11.webp" },
    "farming": { name: "Chăn thả", icon: "fa-cow", img: "https://cdn.paldb.cc/image/Pal/Texture/UI/InGame/T_icon_palwork_12.webp" }
};

// Khởi chạy ứng dụng khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

// Hàm khởi tạo dữ liệu và gắn sự kiện
async function initApp() {
    const spinner = document.getElementById("loading-spinner");
    const palGrid = document.getElementById("pal-grid");

    try {
        // Kiểm tra dữ liệu từ file bundle (tránh lỗi CORS khi mở bằng file://)
        if (window.PALS_DATA && Array.isArray(window.PALS_DATA)) {
            allPals = window.PALS_DATA;
        } else {
            // Nếu chạy trên server, thử fetch từ data/pals.json
            const resp = await fetch("data/pals.json");
            allPals = await resp.json();
        }

        // Ẩn spinner loading và hiện lưới Pal
        spinner.classList.add("hidden");
        palGrid.classList.remove("hidden");

        // Cập nhật tổng số Pal lên header
        document.getElementById("total-count").textContent = allPals.length;

        // Gắn các sự kiện tương tác bộ lọc
        setupEventListeners();

        // Khởi tạo hệ thống Bản đồ (Dual Maps)
        initMapsSystem();

        // Khởi tạo hệ thống Kỹ năng bị động (Passive Skills)
        initPassivesSystem();

        // Lọc và render lần đầu
        applyFiltersAndRender();

    } catch (err) {
        console.error("Lỗi khi tải dữ liệu Pal:", err);
        spinner.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: #ef4444;"></i>
            <h3>Không thể tải dữ liệu Pal</h3>
            <p>Vui lòng kiểm tra lại file <code>data/pals.json</code> hoặc chạy tool <code>crawler.py 1</code> để tạo dữ liệu.</p>
        `;
    }
}

// ============================================================================
// HÀM LỌC & SẮP XẾP CHÍNH (FILTER & SORT ENGINE)
// ============================================================================
function applyFiltersAndRender() {
    // 1. Bước Lọc (Filtering)
    let filtered = allPals.filter(pal => {
        // --- Lọc theo từ khóa (Tìm tên Pal hoặc mã số #ID) ---
        if (filterState.search) {
            const query = filterState.search.toLowerCase();
            const matchName = pal.name.toLowerCase().includes(query);
            const matchId = (pal.id || "").toString().toLowerCase().includes(query);
            if (!matchName && !matchId) return false;
        }

        // --- Lọc theo Thú cưỡi (Mount Only) ---
        if (filterState.mountOnly) {
            const runSpeed = pal.mount_speed ? (pal.mount_speed.run_speed || 0) : 0;
            if (runSpeed <= 0) return false;
        }

        // --- Lọc theo Hệ (Elements) ---
        if (!filterState.elements.includes("all") && filterState.elements.length > 0) {
            const palElems = pal.elements || [];
            if (filterState.elementLogic === "OR") {
                // Chế độ HOẶC: Pal có ít nhất 1 hệ trùng với hệ được chọn
                const hasAny = filterState.elements.some(el => palElems.includes(el));
                if (!hasAny) return false;
            } else {
                // Chế độ VÀ: Pal phải mang ĐẦY ĐỦ tất cả các hệ được chọn
                const hasAll = filterState.elements.every(el => palElems.includes(el));
                if (!hasAll) return false;
            }
        }

        // --- Lọc theo Kỹ năng làm việc (Work Suitability) ---
        if (filterState.works.length > 0) {
            const palWorks = pal.work_suitability || {};
            for (let work of filterState.works) {
                const palLevel = palWorks[work] || 0;
                if (palLevel < 1) {
                    return false; // Pal phải có kỹ năng được chọn (ít nhất Lv 1)
                }
            }
        }

        return true;
    });

    // 2. Bước Sắp xếp (Sorting)
    filtered.sort((a, b) => {
        // --- Ưu tiên sắp xếp theo Cấp độ Kỹ năng làm việc (nếu bật) ---
        if (filterState.workSortOrder !== "none") {
            const getWorkScore = (pal) => {
                const works = pal.work_suitability || {};
                if (filterState.works.length > 0) {
                    // Nếu đã chọn kỹ năng cụ thể, tính tổng cấp độ của các kỹ năng đó
                    return filterState.works.reduce((acc, w) => acc + (works[w] || 0), 0);
                } else {
                    // Nếu chưa chọn kỹ năng nào, lấy cấp độ cao nhất trong các kỹ năng của Pal
                    const levels = Object.values(works);
                    return levels.length > 0 ? Math.max(...levels) : 0;
                }
            };

            const scoreA = getWorkScore(a);
            const scoreB = getWorkScore(b);

            if (scoreA !== scoreB) {
                return filterState.workSortOrder === "desc" ? (scoreB - scoreA) : (scoreA - scoreB);
            }
        }

        // --- Sắp xếp theo tiêu chí chung (#ID, HP, ATK, DEF, Speed) ---
        const [sortField, sortDir] = filterState.sortBy.split("-");
        const dir = sortDir === "asc" ? 1 : -1;

        if (sortField === "id") {
            // Chuyển ID sang số để sắp xếp (loại bỏ chữ cái nếu có như 5B -> 5.5)
            const idA = parseIdToSortNumber(a.id);
            const idB = parseIdToSortNumber(b.id);
            return (idA - idB) * dir;
        }

        if (sortField === "hp" || sortField === "atk" || sortField === "def") {
            const statsA = a.stats || {};
            const statsB = b.stats || {};
            const valA = statsA[sortField === "atk" ? "attack" : sortField === "def" ? "defense" : "hp"] || 0;
            const valB = statsB[sortField === "atk" ? "attack" : sortField === "def" ? "defense" : "hp"] || 0;
            return (valA - valB) * dir;
        }

        if (sortField === "speed") {
            const speedA = a.mount_speed ? (a.mount_speed.run_speed || 0) : 0;
            const speedB = b.mount_speed ? (b.mount_speed.run_speed || 0) : 0;
            return (speedA - speedB) * dir;
        }

        return 0;
    });

    // 3. Cập nhật số liệu hiển thị & Render ra màn hình
    document.getElementById("visible-count").textContent = filtered.length;
    renderGrid(filtered);
}

// Hàm phụ để xử lý ID đặc biệt (ví dụ: "5B" thành 5.5 để sắp xếp ngay sau "5")
function parseIdToSortNumber(idStr) {
    if (!idStr) return 9999;
    let num = parseFloat(idStr);
    if (isNaN(num)) return 9999;
    if (typeof idStr === "string" && idStr.toLowerCase().includes("b")) {
        num += 0.5;
    }
    return num;
}

// ============================================================================
// HÀM RENDER GIAO DIỆN (DOM RENDERING)
// ============================================================================
function renderGrid(pals) {
    const grid = document.getElementById("pal-grid");
    const noResults = document.getElementById("no-results");

    if (pals.length === 0) {
        grid.classList.add("hidden");
        noResults.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    noResults.classList.add("hidden");

    // Dùng mảng HTML string để render nhanh nhất
    const cardsHTML = pals.map(pal => {
        const idDisplay = pal.id ? `#${pal.id}` : "#★";
        const imgUrl = pal.image_url || "https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_SheepBall_icon_normal.webp";

        // Render Huy hiệu Hệ (Elements)
        const elemsHTML = (pal.elements || []).map(el => {
            const info = ELEMENT_INFO[el] || { name: el, icon: "fa-circle-dot" };
            const iconHTML = info.img ? `<img src="${info.img}" class="badge-icon" alt="${info.name}">` : `<i class="fa-solid ${info.icon}"></i>`;
            return `<span class="badge-el ${el}">${iconHTML} ${info.name}</span>`;
        }).join("");

        // Render Huy hiệu Kỹ năng làm việc (Works)
        const works = pal.work_suitability || {};
        const worksHTML = Object.entries(works).map(([wType, wLevel]) => {
            const info = WORK_INFO[wType] || { name: wType, icon: "fa-hammer" };
            const iconHTML = info.img ? `<img src="${info.img}" class="badge-icon" alt="${info.name}">` : `<i class="fa-solid ${info.icon}"></i>`;
            return `<span class="badge-work" title="${info.name} Cấp ${wLevel}">${iconHTML} ${info.name}: <strong>Cấp ${wLevel}</strong></span>`;
        }).join("");

        // Chỉ số tóm tắt bên dưới thẻ
        const stats = pal.stats || {};
        const hp = stats.hp || "-";
        const atk = stats.attack || "-";
        const def = stats.defense || "-";
        const speed = (pal.mount_speed && pal.mount_speed.run_speed > 0) ? pal.mount_speed.run_speed : "-";

        return `
            <div class="pal-card" onclick="openPalModal('${pal.name.replace(/'/g, "\\'")}')">
                <div class="pal-card-top">
                    <div class="pal-icon-wrapper">
                        <img loading="lazy" src="${imgUrl}" alt="${pal.name}" onerror="this.src='https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_SheepBall_icon_normal.webp'">
                    </div>
                    <div class="pal-header-info">
                        <span class="pal-id">${idDisplay}</span>
                        <h3 class="pal-name" title="${pal.name}">${pal.name}</h3>
                        <div class="pal-elements">${elemsHTML}</div>
                    </div>
                </div>

                <div class="pal-works">
                    ${worksHTML || '<span class="badge-work" style="opacity:0.5;">Không có kỹ năng làm việc</span>'}
                </div>

                <div class="pal-stats-footer">
                    <div class="stat-box">
                        <span class="stat-label">❤️ HP</span>
                        <span class="stat-val hp">${hp}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">⚔️ ATK</span>
                        <span class="stat-val atk">${atk}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">${speed !== "-" ? "⚡ Tốc độ" : "🛡️ DEF"}</span>
                        <span class="stat-val ${speed !== "-" ? "speed" : "def"}">${speed !== "-" ? speed : def}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    grid.innerHTML = cardsHTML;
}

// ============================================================================
// HÀM GẮN SỰ KIỆN TƯƠNG TÁC (EVENT LISTENERS)
// ============================================================================
function setupEventListeners() {
    // 1. Tìm kiếm nhanh (Search input)
    const searchInput = document.getElementById("search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    searchInput.addEventListener("input", (e) => {
        filterState.search = e.target.value.trim();
        if (filterState.search) {
            clearSearchBtn.classList.remove("hidden");
        } else {
            clearSearchBtn.classList.add("hidden");
        }
        applyFiltersAndRender();
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        filterState.search = "";
        clearSearchBtn.classList.add("hidden");
        applyFiltersAndRender();
    });

    // 2. Sắp xếp (Sort dropdown)
    document.getElementById("sort-select").addEventListener("change", (e) => {
        filterState.sortBy = e.target.value;
        applyFiltersAndRender();
    });

    // 3. Lọc theo Hệ (Element buttons)
    const elementChips = document.querySelectorAll(".element-chip");
    elementChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const el = chip.dataset.element;

            if (el === "all") {
                filterState.elements = ["all"];
                elementChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
            } else {
                // Xóa chip "Tất cả" nếu đang chọn hệ lẻ
                const allChip = document.querySelector('.element-chip[data-element="all"]');
                allChip.classList.remove("active");
                filterState.elements = filterState.elements.filter(x => x !== "all");

                // Toggle chọn/bỏ chọn
                if (filterState.elements.includes(el)) {
                    filterState.elements = filterState.elements.filter(x => x !== el);
                    chip.classList.remove("active");
                } else {
                    filterState.elements.push(el);
                    chip.classList.add("active");
                }

                // Nếu không chọn hệ nào thì quay về "Tất cả"
                if (filterState.elements.length === 0) {
                    filterState.elements = ["all"];
                    allChip.classList.add("active");
                }
            }
            applyFiltersAndRender();
        });
    });

    // Toggle logic AND / OR cho Hệ
    const btnOR = document.getElementById("element-logic-or");
    const btnAND = document.getElementById("element-logic-and");

    btnOR.addEventListener("click", () => {
        filterState.elementLogic = "OR";
        btnOR.classList.add("active");
        btnAND.classList.remove("active");
        applyFiltersAndRender();
    });

    btnAND.addEventListener("click", () => {
        filterState.elementLogic = "AND";
        btnAND.classList.add("active");
        btnOR.classList.remove("active");
        applyFiltersAndRender();
    });

    // 4. Lọc theo Kỹ năng làm việc (Work Suitabilities)
    const workChips = document.querySelectorAll(".work-chip");
    workChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const work = chip.dataset.work;
            if (filterState.works.includes(work)) {
                filterState.works = filterState.works.filter(w => w !== work);
                chip.classList.remove("active");
            } else {
                filterState.works.push(work);
                chip.classList.add("active");
            }
            applyFiltersAndRender();
        });
    });

    // Sắp xếp theo cấp độ kỹ năng làm việc
    document.getElementById("work-sort-order").addEventListener("change", (e) => {
        filterState.workSortOrder = e.target.value;
        applyFiltersAndRender();
    });

    // 5. Nút Chỉ hiện Thú cưỡi (Mount Only)
    const mountBtn = document.getElementById("toggle-mount-only");
    mountBtn.addEventListener("click", () => {
        filterState.mountOnly = !filterState.mountOnly;
        mountBtn.classList.toggle("active", filterState.mountOnly);
        applyFiltersAndRender();
    });

    // 6. Đặt lại tất cả bộ lọc (Reset buttons)
    const resetFunc = () => {
        filterState = {
            search: "",
            elements: ["all"],
            elementLogic: "OR",
            works: [],
            workSortOrder: "desc",
            mountOnly: false,
            sortBy: "id-asc"
        };

        // UI Reset
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        document.getElementById("sort-select").value = "id-asc";
        document.getElementById("work-sort-order").value = "desc";

        elementChips.forEach(c => c.classList.remove("active"));
        document.querySelector('.element-chip[data-element="all"]').classList.add("active");

        btnOR.classList.add("active");
        btnAND.classList.remove("active");

        workChips.forEach(c => c.classList.remove("active"));
        mountBtn.classList.remove("active");

        applyFiltersAndRender();
    };

    document.getElementById("reset-filters").addEventListener("click", resetFunc);
    document.getElementById("empty-reset-btn").addEventListener("click", resetFunc);

    // 7. Đóng Modal chi tiết
    document.getElementById("close-modal").addEventListener("click", closePalModal);
    document.getElementById("pal-modal").addEventListener("click", (e) => {
        if (e.target.id === "pal-modal") closePalModal();
    });
}

// ============================================================================
// HÀM HIỂN THỊ CHI TIẾT PAL (MODAL POPUP)
// ============================================================================
function openPalModal(palName) {
    const pal = allPals.find(p => p.name === palName);
    if (!pal) return;

    const modal = document.getElementById("pal-modal");
    const modalBody = document.getElementById("modal-body");

    const idDisplay = pal.id ? `#${pal.id}` : "#★";
    const imgUrl = pal.image_url || "https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_SheepBall_icon_normal.webp";

    const elemsHTML = (pal.elements || []).map(el => {
        const info = ELEMENT_INFO[el] || { name: el, icon: "fa-circle-dot" };
        const iconHTML = info.img ? `<img src="${info.img}" class="badge-icon" alt="${info.name}">` : `<i class="fa-solid ${info.icon}"></i>`;
        return `<span class="badge-el ${el}">${iconHTML} ${info.name}</span>`;
    }).join("");

    const stats = pal.stats || {};
    const mount = pal.mount_speed || {};

    const works = pal.work_suitability || {};
    const worksHTML = Object.entries(works).map(([wType, wLevel]) => {
        const info = WORK_INFO[wType] || { name: wType, icon: "fa-hammer" };
        const iconHTML = info.img ? `<img src="${info.img}" class="badge-icon" alt="${info.name}">` : `<i class="fa-solid ${info.icon}"></i>`;
        return `<span class="badge-work">${iconHTML} ${info.name}: <strong>Cấp ${wLevel}</strong></span>`;
    }).join("");

    // Xử lý dữ liệu Drops (vật phẩm tiêu diệt) và Ranch Drops (vật phẩm chăn thả)
    const hasRanch = (works.farming && works.farming > 0) || (pal.ranch_drops && pal.ranch_drops.length > 0);
    const ranchDrops = pal.ranch_drops || [];
    let ranchContentHTML = "";
    if (ranchDrops.length > 0) {
        const groupedRanch = {};
        ranchDrops.forEach(d => {
            if (!groupedRanch[d.name]) {
                groupedRanch[d.name] = { name: d.name, image: d.image, levels: [] };
            }
            groupedRanch[d.name].levels.push(d);
        });

        ranchContentHTML = Object.values(groupedRanch).map(g => {
            const levelsBadges = g.levels.map(l => {
                const rateText = l.rate && l.rate !== "100%" ? ` (${l.rate})` : "";
                return `<span class="drop-level-badge"><strong>Lv.${l.level}</strong>: ${l.quantity || "1"}${rateText}</span>`;
            }).join("");

            return `
                <div class="drop-item-card ranch-card">
                    <div class="drop-item-icon">
                        <img src="${g.image || 'https://cdn.paldb.cc/image/Others/InventoryItemIcon/Texture/T_itemicon_Material_Wool.webp'}" alt="${g.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="drop-item-info">
                        <span class="drop-item-name">${g.name}</span>
                        <div class="drop-item-levels">${levelsBadges}</div>
                    </div>
                </div>
            `;
        }).join("");
    } else if (hasRanch) {
        ranchContentHTML = `<p class="empty-drop-text">Pal này có kỹ năng Chăn thả tại Ranch (Farming Cấp ${works.farming || 1}).</p>`;
    }

    const dropsList = pal.drops || [];
    let dropsContentHTML = "";
    if (dropsList.length > 0) {
        dropsContentHTML = dropsList.map(d => `
            <div class="drop-item-card">
                <div class="drop-item-icon">
                    <img src="${d.image || 'https://cdn.paldb.cc/image/Others/InventoryItemIcon/Texture/T_itemicon_Material_Wool.webp'}" alt="${d.name}" onerror="this.style.display='none'">
                </div>
                <div class="drop-item-info">
                    <span class="drop-item-name">${d.name}</span>
                    <div class="drop-item-details">
                        <span class="drop-qty-badge"><i class="fa-solid fa-cubes"></i> Số lượng: <strong>${d.quantity || "1"}</strong></span>
                        <span class="drop-rate-badge"><i class="fa-solid fa-percent"></i> Tỷ lệ: <strong>${d.rate || "100%"}</strong></span>
                    </div>
                </div>
            </div>
        `).join("");
    } else {
        dropsContentHTML = `<p class="empty-drop-text">Không có dữ liệu vật phẩm rơi khi tiêu diệt cho Pal này.</p>`;
    }

    const dropsHTML = `
        ${hasRanch ? `
            <div class="modal-section-title"><i class="fa-solid fa-cow text-emerald-400"></i> Vật phẩm thu được khi Chăn thả tại Ranch (Farming / Grazing Drops)</div>
            <div class="modal-drops-list">
                ${ranchContentHTML}
            </div>
        ` : ''}

        <div class="modal-section-title"><i class="fa-solid fa-skull-crossbones text-rose-400"></i> Vật phẩm rơi khi Tiêu diệt / Mổ thịt (Disassembly / Combat Drops)</div>
        <div class="modal-drops-list">
            ${dropsContentHTML}
        </div>
    `;

    // Xử lý dữ liệu Partner Skill
    const pSkill = pal.partner_skill || {};
    const pSkillName = pSkill.name || "Partner Skill";
    const pSkillDesc = pSkill.description || "";
    const pSkillLevels = pSkill.levels || [];

    let pSkillLevelsHTML = "";
    if (pSkillLevels.length > 0) {
        const sortedLevels = [...pSkillLevels].sort((a, b) => {
            const numA = parseInt((a.level + "").replace(/\D/g, "")) || 1;
            const numB = parseInt((b.level + "").replace(/\D/g, "")) || 1;
            return numA - numB;
        });
        const badgesHTML = sortedLevels.map(l => `
            <span class="partner-level-badge">
                <strong style="color:#facc15; min-width: 44px; display: inline-block;">Lv.${l.level}:</strong> <span>${l.value}</span>
            </span>
        `).join("");
        pSkillLevelsHTML = `
            <div class="partner-levels-box">
                ${badgesHTML}
            </div>
        `;
    }

    const partnerSkillHTML = `
        <div class="modal-section-title"><i class="fa-solid fa-wand-magic-sparkles text-purple-400"></i> Kỹ năng đặc trưng / Đồng hành (${pSkillName})</div>
        <div class="partner-skill-card">
            <div class="partner-skill-desc">
                <i class="fa-solid fa-circle-info text-purple-300"></i>
                <span>${pSkillDesc || 'Không có mô tả cho kỹ năng này.'}</span>
            </div>
            ${pSkillLevelsHTML}
        </div>
    `;

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon">
                <img src="${imgUrl}" alt="${pal.name}" onerror="this.src='https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_SheepBall_icon_normal.webp'">
            </div>
            <div class="modal-title-box">
                <span class="pal-id" style="font-size:0.9rem;">${idDisplay}</span>
                <h2>${pal.name}</h2>
                <div class="pal-elements" style="margin-top:0.5rem;">${elemsHTML}</div>
            </div>
        </div>

        <div class="modal-section-title"><i class="fa-solid fa-chart-simple text-blue-400"></i> Chỉ số chiến đấu cơ bản (Base Stats)</div>
        <div class="modal-grid-stats">
            <div class="modal-stat-card">
                <span class="label">❤️ Sinh lực (HP)</span>
                <span class="val" style="color:#f87171;">${stats.hp || "-"}</span>
            </div>
            <div class="modal-stat-card">
                <span class="label">⚔️ Tấn công (ATK)</span>
                <span class="val" style="color:#fb923c;">${stats.attack || "-"}</span>
            </div>
            <div class="modal-stat-card">
                <span class="label">🛡️ Phòng thủ (DEF)</span>
                <span class="val" style="color:#38bdf8;">${stats.defense || "-"}</span>
            </div>
        </div>

        ${mount.run_speed > 0 ? `
            <div class="modal-section-title"><i class="fa-solid fa-horse text-yellow-400"></i> Tốc độ di chuyển / Thú cưỡi (Mount Speed)</div>
            <div class="modal-grid-stats">
                <div class="modal-stat-card">
                    <span class="label">🏃 Tốc độ chạy (Run)</span>
                    <span class="val" style="color:#facc15;">${mount.run_speed}</span>
                </div>
                <div class="modal-stat-card">
                    <span class="label">⚡ Tốc độ nước rút (Sprint)</span>
                    <span class="val" style="color:#eab308;">${mount.sprint_speed}</span>
                </div>
                <div class="modal-stat-card">
                    <span class="label">🔋 Thể lực (Stamina)</span>
                    <span class="val" style="color:#a855f7;">${mount.stamina}</span>
                </div>
            </div>
        ` : ''}

        ${partnerSkillHTML}

        <div class="modal-section-title"><i class="fa-solid fa-hammer text-green-400"></i> Kỹ năng làm việc tại Trại (Work Suitability)</div>
        <div class="modal-work-list">
            ${worksHTML || '<p style="color:var(--text-secondary); font-size:0.9rem;">Pal này không có kỹ năng làm việc tại căn cứ.</p>'}
        </div>
        ${dropsHTML}
    `;

    modal.classList.remove("hidden");
}

function closePalModal() {
    document.getElementById("pal-modal").classList.add("hidden");
}

// ============================================================================
// HỆ THỐNG BẢN ĐỒ TƯƠNG TÁC DUAL MAPS (PALPAGOS & THE WORLD TREE)
// ============================================================================
let currentMode = "pals";
let currentMapType = "palpagos";
let mapSpawnData = null;
let leafletMap = null;
let markersLayerGroup = null;
let selectedMapPalId = "";
let activeSpawnFilters = { day: true, night: true, boss: true };

async function initMapsSystem() {
    // 1. Gắn sự kiện chuyển đổi Mode (Pals vs Maps vs Passives)
    const tabPals = document.getElementById("tab-btn-pals");
    const tabMaps = document.getElementById("tab-btn-maps");
    const tabPassives = document.getElementById("tab-btn-passives");
    const viewPals = document.getElementById("view-pals");
    const viewMaps = document.getElementById("view-maps");
    const viewPassives = document.getElementById("view-passives");

    function switchTab(mode) {
        currentMode = mode;
        if (tabPals) tabPals.classList.toggle("active", mode === "pals");
        if (tabMaps) tabMaps.classList.toggle("active", mode === "maps");
        if (tabPassives) tabPassives.classList.toggle("active", mode === "passives");

        if (viewPals) viewPals.classList.toggle("hidden", mode !== "pals");
        if (viewMaps) viewMaps.classList.toggle("hidden", mode !== "maps");
        if (viewPassives) viewPassives.classList.toggle("hidden", mode !== "passives");

        if (mode === "maps") {
            if (!leafletMap) {
                setupLeafletMap();
            } else {
                setTimeout(() => leafletMap.invalidateSize(), 150);
            }
        }
    }

    if (tabPals) tabPals.addEventListener("click", () => switchTab("pals"));
    if (tabMaps) tabMaps.addEventListener("click", () => switchTab("maps"));
    if (tabPassives) tabPassives.addEventListener("click", () => switchTab("passives"));

    // 2. Tải dữ liệu bản đồ map_spawn_data.json (Hỗ trợ mở trực tiếp file:// qua window.MAP_SPAWN_DATA hoặc fetch từ server)
    if (window.MAP_SPAWN_DATA) {
        mapSpawnData = window.MAP_SPAWN_DATA;
    } else {
        try {
            const resp = await fetch("data/map_spawn_data.json");
            mapSpawnData = await resp.json();
        } catch (e) {
            console.warn("Chưa tải được map_spawn_data.json, đang dùng dữ liệu mặc định...", e);
        }
    }

    // 3. Populate Pal Select Dropdown
    populateMapPalSelector();

    // 4. Gắn sự kiện chọn bản đồ (Palpagos vs The World Tree)
    const mapButtons = document.querySelectorAll(".map-btn");
    mapButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const chosenMap = btn.dataset.map;
            if (chosenMap !== currentMapType) {
                currentMapType = chosenMap;
                mapButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                
                const titleSpan = document.getElementById("current-map-title");
                if (currentMapType === "palpagos") {
                    titleSpan.innerHTML = '<i class="fa-solid fa-earth-oceania"></i> Bản đồ: <strong>Palpagos Islands</strong> (Main Map)';
                } else {
                    titleSpan.innerHTML = '<i class="fa-solid fa-tree"></i> Bản đồ: <strong>The World Tree</strong> (Sakurajima Map)';
                }

                if (leafletMap) {
                    switchLeafletTiles();
                    renderMapMarkers();
                }
            }
        });
    });

    // 5. Gắn sự kiện chọn Pal từ Dropdown và Search box
    const palSelect = document.getElementById("map-pal-select");
    const palSearch = document.getElementById("map-pal-search");
    const clearPalBtn = document.getElementById("clear-map-pal");

    palSelect.addEventListener("change", () => {
        selectedMapPalId = palSelect.value;
        updateSelectedPalUI();
        renderMapMarkers();
    });

    palSearch.addEventListener("input", (e) => {
        const kw = e.target.value.toLowerCase().trim();
        if (!kw) return;
        const matched = allPals.find(p => p.name.toLowerCase().includes(kw) || (p.id||"").toString().toLowerCase() === kw);
        if (matched) {
            palSelect.value = matched.id;
            selectedMapPalId = matched.id;
            updateSelectedPalUI();
            renderMapMarkers();
        }
    });

    clearPalBtn.addEventListener("click", () => {
        selectedMapPalId = "";
        palSelect.value = "";
        palSearch.value = "";
        updateSelectedPalUI();
        renderMapMarkers();
    });

    // 6. Gắn sự kiện lọc loại spawn (Day, Night, Boss)
    const spawnChips = document.querySelectorAll(".spawn-chip");
    spawnChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const st = chip.dataset.spawn;
            activeSpawnFilters[st] = !activeSpawnFilters[st];
            if (activeSpawnFilters[st]) chip.classList.add("active");
            else chip.classList.remove("active");
            renderMapMarkers();
        });
    });

    // 7. Gắn sự kiện nút Chuyển bản đồ nhanh trên Alert banner
    document.getElementById("switch-map-btn").addEventListener("click", () => {
        const target = currentMapType === "palpagos" ? "world_tree" : "palpagos";
        const targetBtn = document.querySelector(`.map-btn[data-map="${target}"]`);
        if (targetBtn) targetBtn.click();
    });
}

function populateMapPalSelector() {
    const sel = document.getElementById("map-pal-select");
    let optionsHTML = '<option value="">-- Chọn 1 Pal từ 299 Pal để xem vị trí --</option>';
    allPals.forEach(p => {
        optionsHTML += `<option value="${p.id}">#${p.id || "?"} - ${p.name}</option>`;
    });
    sel.innerHTML = optionsHTML;
}

function updateSelectedPalUI() {
    const infoBadge = document.getElementById("selected-pal-info");
    const clearBtn = document.getElementById("clear-map-pal");
    const iconImg = document.getElementById("map-pal-icon");
    const nameSpan = document.getElementById("map-pal-name");

    if (!selectedMapPalId) {
        infoBadge.classList.add("hidden");
        clearBtn.classList.add("hidden");
        document.getElementById("cross-map-alert").classList.add("hidden");
        return;
    }

    const pal = allPals.find(p => p.id === selectedMapPalId);
    if (pal) {
        let imgUrl = pal.image_url || `https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_${pal.name.replace(/\s+/g,"")}_icon_normal.webp`;
        iconImg.src = imgUrl;
        nameSpan.textContent = `#${pal.id || "?"} ${pal.name}`;
        infoBadge.classList.remove("hidden");
        clearBtn.classList.remove("hidden");
    }
}

async function setupLeafletMap() {
    if (typeof L === "undefined") {
        console.error("Leaflet thư viện chưa tải!");
        return;
    }

    // Leaflet CRS.Simple cho game coordinate grid
    leafletMap = L.map("leaflet-map", {
        crs: L.CRS.Simple,
        minZoom: 0,
        maxZoom: 6,
        zoom: 1,
        zoomControl: true,
        attributionControl: false
    });

    markersLayerGroup = L.layerGroup().addTo(leafletMap);

    // Custom Control hiển thị mức Zoom ngay cạnh nút +/- để dễ debug khi thu phóng
    const zoomDebugControl = L.control({ position: "topleft" });
    zoomDebugControl.onAdd = function() {
        const div = L.DomUtil.create("div", "zoom-debug-badge");
        div.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> Zoom: <span id="map-debug-zoom-val">1.0</span>`;
        return div;
    };
    zoomDebugControl.addTo(leafletMap);

    leafletMap.on("zoomend", function() {
        updateMapZoomClasses();
        updateDebugXYBar(leafletMap.getCenter());
    });
    leafletMap.on("mousemove", function(e) {
        updateDebugXYBar(e.latlng);
    });
    leafletMap.on("move", function() {
        updateDebugXYBar(leafletMap.getCenter(), true);
    });

    switchLeafletTiles();
}

function updateMapZoomClasses() {
    if (!leafletMap) return;
    const currentZoom = leafletMap.getZoom();
    const mapContainer = document.getElementById("leaflet-map");
    if (mapContainer) {
        // Khi ở mức thu nhỏ nhìn toàn bản đồ (zoom <= 2), bật class zoomed-out để các điểm nhấp nháy sang Đỏ
        if (currentZoom <= 2) {
            mapContainer.classList.add("zoomed-out");
        } else {
            mapContainer.classList.remove("zoomed-out");
        }
    }
    // Cập nhật chỉ số Zoom trên huy hiệu debug gần nút +/-
    const zoomValElem = document.getElementById("map-debug-zoom-val");
    if (zoomValElem) {
        zoomValElem.textContent = currentZoom.toFixed(1);
    }
}

function updateDebugXYBar(latlng, onlyCenter = false) {
    if (!leafletMap || !latlng) return;
    const mapConfig = mapSpawnData?.maps?.[currentMapType]?.config || {
        minMapTextureBlockSize: { X: 8192, Y: 8192 },
        landScapeRealPositionMin: currentMapType === "palpagos" ? { X: -1099400, Y: -724400 } : { X: 347351.5, Y: -818197 },
        landScapeRealPositionMax: currentMapType === "palpagos" ? { X: 349400, Y: 724400 } : { X: 689148.5, Y: -476400 }
    };

    if (!onlyCenter) {
        const rpos = getRposFromLatLng(latlng, mapConfig);
        const mouseXYElem = document.getElementById("debug-mouse-xy");
        if (mouseXYElem) mouseXYElem.textContent = `${rpos.X} , ${rpos.Y}`;

        const currentZoom = Math.floor(leafletMap.getZoom());
        const checkZ = Math.max(0, Math.min(6, currentZoom));
        const pointAtZ = leafletMap.project(latlng, checkZ);
        const tileX = Math.floor(pointAtZ.x / 512);
        const tileY = Math.floor(pointAtZ.y / 512);

        const zoomLevelElem = document.getElementById("debug-zoom-level");
        const tileIndexElem = document.getElementById("debug-tile-index");
        if (zoomLevelElem) zoomLevelElem.textContent = checkZ;
        if (tileIndexElem) tileIndexElem.textContent = `[${tileX}, ${tileY}]`;
    }

    // Luôn cập nhật tọa độ tâm bản đồ
    const centerLatLng = leafletMap.getCenter();
    const centerRpos = getRposFromLatLng(centerLatLng, mapConfig);
    const centerXYElem = document.getElementById("debug-center-xy");
    if (centerXYElem) centerXYElem.textContent = `${centerRpos.X} , ${centerRpos.Y}`;
}

let activeTileLayer = null;
function switchLeafletTiles() {
    if (!leafletMap) return;
    if (activeTileLayer) leafletMap.removeLayer(activeTileLayer);

    const mapConfig = mapSpawnData?.maps?.[currentMapType] || {
        imageMapDir: currentMapType === "palpagos" ? "image/map8/" : "image/treemap8/",
        config: {
            minMapTextureBlockSize: { X: 8192, Y: 8192 },
            landScapeRealPositionMin: currentMapType === "palpagos" ? { X: -1099400, Y: -724400 } : { X: 347351.5, Y: -818197 },
            landScapeRealPositionMax: currentMapType === "palpagos" ? { X: 349400, Y: 724400 } : { X: 689148.5, Y: -476400 }
        }
    };

    const blockSize = mapConfig.config?.minMapTextureBlockSize || { X: 8192, Y: 8192 };
    
    // NATIVE_ZOOM = 4 vì CDN ảnh ở mức zoom max là 4 (16x16 tiles * 512px = 8192x8192px chuẩn)
    const NATIVE_ZOOM = 4;
    const bottomLeft = leafletMap.unproject([0, blockSize.Y], NATIVE_ZOOM);
    const topRight = leafletMap.unproject([blockSize.X, 0], NATIVE_ZOOM);
    const bounds = L.latLngBounds(bottomLeft, topRight); // Chuẩn LatLng [-512, 0] đến [0, 512] cho toàn bộ map

    // Tải map tiles từ CDN paldb.cc (Định dạng chuẩn z{z}x{x}y{y}.webp với tileSize 512)
    const tileDir = mapConfig.imageMapDir || (currentMapType === "palpagos" ? "image/map8/" : "image/treemap8/");
    const tileUrl = `https://cdn.paldb.cc/${tileDir}z{z}x{x}y{y}.webp`;

    activeTileLayer = L.tileLayer(tileUrl, {
        minZoom: 0,
        maxZoom: 6,
        maxNativeZoom: NATIVE_ZOOM,
        noWrap: true,
        tileSize: 512,
        errorTileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="%231455a4"/></svg>'
    }).addTo(leafletMap);

    // Xử lý thông minh đệ quy khi CDN paldb.cc trả về 403 (bị thiếu ảnh gạch ở zoom lớn, đặc biệt ở The World Tree)
    activeTileLayer.on("tileerror", function(e) {
        if (!e.tile) return;
        const coords = e.coords || (e.tile && e.tile._coords);
        // Nếu ở mức zoom <= 0 hoặc không xác định tọa độ, điền nền màu biển SVG
        if (!coords || coords.z <= 0) {
            e.tile.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="%231455a4"/></svg>';
            e.tile.style.background = "#1455a4";
            return;
        }

        // Đệ quy tìm ảnh cha (z - 1, z - 2...) nếu ảnh hiện tại hoặc cha bị thiếu trên CDN
        function tryRecoverFromAncestor(targetTile, origZ, origX, origY, checkZ) {
            if (checkZ < 0) {
                targetTile.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="%231455a4"/></svg>';
                targetTile.style.background = "#1455a4";
                return;
            }

            const dz = origZ - checkZ;
            const M = Math.pow(2, dz);
            const parentX = Math.floor(origX / M);
            const parentY = Math.floor(origY / M);
            const ox = origX - (parentX * M);
            const oy = origY - (parentY * M);

            const parentUrl = `https://cdn.paldb.cc/${tileDir}z${checkZ}x${parentX}y${parentY}.webp`;
            const testImg = new Image();
            // KHÔNG dùng crossOrigin="anonymous" ở đây để tránh bị Cloudflare chặn lỗi 403
            testImg.onload = function() {
                // Tải ảnh thành công -> Cắt đúng góc phần tư bằng CSS background-image siêu chuẩn xác và mượt mà
                targetTile.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"></svg>';
                targetTile.style.backgroundImage = `url("${parentUrl}")`;
                targetTile.style.backgroundSize = `${M * 100}% ${M * 100}%`;
                targetTile.style.backgroundPosition = `-${ox * 512}px -${oy * 512}px`;
                targetTile.style.backgroundRepeat = "no-repeat";
            };
            testImg.onerror = function() {
                // Nếu mức checkZ cũng bị thiếu trên CDN, đệ quy tiếp lên mức checkZ - 1 (cho đến z=0 nơi luôn có ảnh)
                tryRecoverFromAncestor(targetTile, origZ, origX, origY, checkZ - 1);
            };
            testImg.src = parentUrl;
        }

        tryRecoverFromAncestor(e.tile, coords.z, coords.x, coords.y, coords.z - 1);
    });

    // Mở rộng giới hạn kéo thả (pad 0.6) để không bị hiện tượng "dính / giật ngược lại" khi kéo ra mép bản đồ
    leafletMap.setMaxBounds(bounds.pad(0.6));
    const center = leafletMap.unproject([blockSize.X / 2, blockSize.Y / 2], NATIVE_ZOOM);
    leafletMap.setView(center, 1);
    updateMapZoomClasses();
    updateDebugXYBar(center);
}

// Chuyển đổi ngược từ LatLng của Leaflet sang tọa độ thực Rpos (X, Y) của game để Debug
function getRposFromLatLng(latlng, mapConfig) {
    if (!mapConfig || !latlng || !leafletMap) return { X: 0, Y: 0 };
    const minX = mapConfig.landScapeRealPositionMin.X;
    const minY = mapConfig.landScapeRealPositionMin.Y;
    const maxX = mapConfig.landScapeRealPositionMax.X;
    const maxY = mapConfig.landScapeRealPositionMax.Y;
    const blockSize = mapConfig.minMapTextureBlockSize || { X: 8192, Y: 8192 };
    const NATIVE_ZOOM = 4;

    const point = leafletMap.project(latlng, NATIVE_ZOOM);
    const scaleY = point.x / blockSize.Y;
    const scaleX = 1 - (point.y / blockSize.X);

    return {
        X: Math.round(minX + scaleX * (maxX - minX)),
        Y: Math.round(minY + scaleY * (maxY - minY))
    };
}

// Chuyển đổi tọa độ thực Rpos (X, Y) sang LatLng của Leaflet theo công thức projTpos của paldb.cc
function getLatLngFromRpos(rpos, mapConfig) {
    const minX = mapConfig.landScapeRealPositionMin.X;
    const minY = mapConfig.landScapeRealPositionMin.Y;
    const maxX = mapConfig.landScapeRealPositionMax.X;
    const maxY = mapConfig.landScapeRealPositionMax.Y;
    const blockSize = mapConfig.minMapTextureBlockSize || { X: 8192, Y: 8192 };

    const scaleX = (rpos.X - minX) / (maxX - minX);
    const scaleY = (rpos.Y - minY) / (maxY - minY);

    // projTpos chuẩn paldb.cc: [scaleY * blockSize.Y, (1 - scaleX) * blockSize.X]
    const pixelX = scaleY * blockSize.Y;
    const pixelY = (1 - scaleX) * blockSize.X;
    return leafletMap.unproject([pixelX, pixelY], 4); // Luôn unproject theo NATIVE_ZOOM = 4
}

// Chuyển đổi tọa độ grid Ipos sang LatLng của Leaflet cho các Boss
function getLatLngFromIpos(ipos, mapConfig, mapType) {
    const isPalpagos = (mapType === "palpagos");
    const perPixel = 459;
    const minX = mapConfig.landScapeRealPositionMin.X;
    const minY = mapConfig.landScapeRealPositionMin.Y;
    const maxX = mapConfig.landScapeRealPositionMax.X;
    const maxY = mapConfig.landScapeRealPositionMax.Y;
    const blockSize = mapConfig.minMapTextureBlockSize || { X: 8192, Y: 8192 };

    const transform_x_pixel = (maxX - minX) / perPixel;
    const transform_y_pixel = (maxY - minY) / perPixel;
    const ingame_x_start = isPalpagos ? (1000 + (-582888 - minX) / perPixel) : -648.7;
    const ingame_y_start = isPalpagos ? (1000 + (-301000 - minY) / perPixel) : 127.7;

    const scaleX = (ipos.Y + ingame_x_start) / transform_x_pixel;
    const scaleY = (ipos.X + ingame_y_start) / transform_y_pixel;

    // projTpos chuẩn paldb.cc: [scaleY * blockSize.Y, (1 - scaleX) * blockSize.X]
    const pixelX = scaleY * blockSize.Y;
    const pixelY = (1 - scaleX) * blockSize.X;
    return leafletMap.unproject([pixelX, pixelY], 4); // Luôn unproject theo NATIVE_ZOOM = 4
}

function mapWithin(rpos, mapConfig) {
    return rpos.X > mapConfig.landScapeRealPositionMin.X &&
           rpos.X < mapConfig.landScapeRealPositionMax.X &&
           rpos.Y > mapConfig.landScapeRealPositionMin.Y &&
           rpos.Y < mapConfig.landScapeRealPositionMax.Y;
}

function renderMapMarkers() {
    if (!leafletMap || !markersLayerGroup) return;
    markersLayerGroup.clearLayers();

    const alertBanner = document.getElementById("cross-map-alert");
    alertBanner.classList.add("hidden");

    if (!selectedMapPalId || !mapSpawnData) {
        document.getElementById("spawn-count-day").textContent = "0";
        document.getElementById("spawn-count-night").textContent = "0";
        document.getElementById("spawn-count-boss").textContent = "0";
        return;
    }

    const pal = allPals.find(p => p.id === selectedMapPalId);
    if (!pal) return;

    const locData = mapSpawnData.pal_locations?.[selectedMapPalId] || {};
    const dayLocs = locData.dayTimeLocations || [];
    const nightLocs = locData.nightTimeLocations || [];

    const currentMapInfo = mapSpawnData.maps?.[currentMapType] || {};
    const mapConfig = currentMapInfo.config || {
        minMapTextureBlockSize: { X: 8192, Y: 8192 },
        landScapeRealPositionMin: currentMapType === "palpagos" ? { X: -1099400, Y: -724400 } : { X: 347351.5, Y: -818197 },
        landScapeRealPositionMax: currentMapType === "palpagos" ? { X: 349400, Y: 724400 } : { X: 689148.5, Y: -476400 }
    };

    const bossesList = currentMapInfo.bosses || [];
    let dayCount = 0, nightCount = 0, bossCount = 0;

    let dayMarkersOnOtherMap = 0, nightMarkersOnOtherMap = 0;

    // Bán kính chuẩn paldb.cc: 0.7 cho đàn đông (>2 điểm) hoặc 2 cho điểm hiếm (<=2 điểm)
    const r = (dayLocs.length + nightLocs.length) <= 2 ? 2 : 0.7;

    // 1. Vẽ tọa độ Ban ngày (Day)
    if (activeSpawnFilters.day) {
        dayLocs.forEach(loc => {
            if (mapWithin(loc, mapConfig)) {
                dayCount++;
                const latlng = getLatLngFromRpos(loc, mapConfig);
                const circle = L.circle(latlng, {
                    className: "pal-spawn-circle day-circle",
                    color: "#f59e0b",
                    fillColor: "#fbbf24",
                    fillOpacity: 0.55,
                    weight: 2,
                    radius: r
                }).addTo(markersLayerGroup);

                circle.bindPopup(`
                    <div class="map-popup-card">
                        <h4><i class="fa-solid fa-sun text-warning"></i> ${pal.name} (Ban ngày)</h4>
                        ${loc.lv ? `<div style="margin-bottom:4px;">Cấp độ: <strong>Lv.${loc.lv}</strong></div>` : ''}
                        <div class="coords">X: ${Math.round(loc.X)}, Y: ${Math.round(loc.Y)}</div>
                    </div>
                `);
            } else {
                dayMarkersOnOtherMap++;
            }
        });
    } else {
        dayLocs.forEach(loc => { if (!mapWithin(loc, mapConfig)) dayMarkersOnOtherMap++; });
    }

    // 2. Vẽ tọa độ Ban đêm (Night)
    if (activeSpawnFilters.night) {
        nightLocs.forEach(loc => {
            if (mapWithin(loc, mapConfig)) {
                nightCount++;
                const latlng = getLatLngFromRpos(loc, mapConfig);
                const circle = L.circle(latlng, {
                    className: "pal-spawn-circle night-circle",
                    color: "#38bdf8",
                    fillColor: "#0284c7",
                    fillOpacity: 0.55,
                    weight: 2,
                    radius: r
                }).addTo(markersLayerGroup);

                circle.bindPopup(`
                    <div class="map-popup-card">
                        <h4><i class="fa-solid fa-moon text-info"></i> ${pal.name} (Ban đêm)</h4>
                        ${loc.lv ? `<div style="margin-bottom:4px;">Cấp độ: <strong>Lv.${loc.lv}</strong></div>` : ''}
                        <div class="coords">X: ${Math.round(loc.X)}, Y: ${Math.round(loc.Y)}</div>
                    </div>
                `);
            } else {
                nightMarkersOnOtherMap++;
            }
        });
    } else {
        nightLocs.forEach(loc => { if (!mapWithin(loc, mapConfig)) nightMarkersOnOtherMap++; });
    }

    // 3. Vẽ tọa độ Boss / Alpha
    if (activeSpawnFilters.boss) {
        const palNameLower = pal.name.toLowerCase().replace(/\s+/g,"");
        bossesList.forEach(b => {
            const bIdLower = (b.id || "").toLowerCase().replace(/_/g,"");
            const bItemLower = (b.item || "").toLowerCase().replace(/\s+/g,"");
            
            if (bItemLower === palNameLower || bIdLower === palNameLower || bIdLower === "boss" + palNameLower) {
                bossCount++;
                let latlng = null;
                if (b.pos && b.pos.X !== undefined) {
                    latlng = getLatLngFromRpos(b.pos, mapConfig);
                } else if (b.ipos && b.ipos.X !== undefined) {
                    latlng = getLatLngFromIpos(b.ipos, mapConfig, currentMapType);
                }

                if (latlng) {
                    const bossIcon = L.divIcon({
                        className: "custom-boss-icon",
                        html: `<div style="background:rgba(239,68,68,0.95); border:2.5px solid #fff; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px #ef4444;"><i class="fa-solid fa-skull" style="color:#fff; font-size:19px;"></i></div>`,
                        iconSize: [38, 38],
                        iconAnchor: [19, 19]
                    });

                    const marker = L.marker(latlng, { icon: bossIcon }).addTo(markersLayerGroup);
                    let bossImg = b.fixed_icon || pal.image_url || "";
                    marker.bindPopup(`
                        <div class="map-popup-card">
                            ${bossImg ? `<img src="${bossImg}" alt="">` : ''}
                            <h4><i class="fa-solid fa-skull text-danger"></i> Boss Alpha: ${b.item || pal.name}</h4>
                            ${b.lv ? `<div>Cấp Boss: <strong style="color:#ef4444;">Lv.${b.lv}</strong></div>` : ''}
                            ${b.comment ? `<div>Địa điểm: ${b.comment}</div>` : ''}
                        </div>
                    `);
                }
            }
        });
    }

    // Cập nhật bộ đếm
    document.getElementById("spawn-count-day").textContent = dayCount;
    document.getElementById("spawn-count-night").textContent = nightCount;
    document.getElementById("spawn-count-boss").textContent = bossCount;

    // 4. Kiểm tra và hiển thị Alert nếu bản đồ hiện tại không có, nhưng bản đồ kia có!
    const totalCurrentMap = dayCount + nightCount + bossCount;
    const totalOtherMap = dayMarkersOnOtherMap + nightMarkersOnOtherMap;

    if (totalCurrentMap === 0 && totalOtherMap > 0) {
        document.getElementById("alert-pal-name").textContent = pal.name;
        document.getElementById("alert-current-map").textContent = currentMapType === "palpagos" ? "Palpagos Islands" : "The World Tree";
        document.getElementById("alert-target-map").textContent = currentMapType === "palpagos" ? "The World Tree (Sakurajima)" : "Palpagos Islands (Bản đồ chính)";
        alertBanner.classList.remove("hidden");
    }

    updateMapZoomClasses();
}

// ============================================================================
// HỆ THỐNG KỸ NĂNG BỊ ĐỘNG (PASSIVE SKILLS)
// ============================================================================
let allPassivesData = [];
let passivesFilterState = {
    search: "",
    category: "pal", // "pal" (chỉ Pal 114 kỹ năng) hoặc "all" (tất cả 309 kỹ năng)
    sortBy: "tier_desc" // "tier_desc", "tier_asc", "name_asc", "name_desc"
};

async function initPassivesSystem() {
    // 1. Tải dữ liệu passives từ window.PASSIVES_DATA hoặc fetch từ data/passives.json
    if (window.PASSIVES_DATA && Array.isArray(window.PASSIVES_DATA)) {
        allPassivesData = window.PASSIVES_DATA;
    } else {
        try {
            const resp = await fetch("data/passives.json");
            allPassivesData = await resp.json();
        } catch (e) {
            console.warn("Chưa tải được passives.json:", e);
            allPassivesData = [];
        }
    }

    // Cập nhật tổng số trên header passives
    const totalCountEl = document.getElementById("passives-total-count");
    if (totalCountEl) totalCountEl.textContent = allPassivesData.length;

    // 2. Gắn sự kiện tìm kiếm & sắp xếp
    const searchInput = document.getElementById("passives-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            passivesFilterState.search = e.target.value.trim().toLowerCase();
            applyPassivesFiltersAndRender();
        });
    }

    const sortSelect = document.getElementById("passives-sort");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            passivesFilterState.sortBy = e.target.value;
            applyPassivesFiltersAndRender();
        });
    }

    // 3. Gắn sự kiện chọn nhóm kỹ năng (Chỉ Pal vs Tất cả)
    const catChips = document.querySelectorAll(".passive-category-chip");
    catChips.forEach(chip => {
        chip.addEventListener("click", () => {
            catChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            passivesFilterState.category = chip.dataset.cat;
            applyPassivesFiltersAndRender();
        });
    });

    // 4. Render lần đầu
    applyPassivesFiltersAndRender();
}

function applyPassivesFiltersAndRender() {
    if (!allPassivesData || allPassivesData.length === 0) return;

    let filtered = allPassivesData.filter(item => {
        // Lọc theo nhóm (category)
        if (passivesFilterState.category === "pal" && !item.is_pal) {
            return false;
        }

        // Lọc theo từ khóa tìm kiếm (tên EN, tên VI, hoặc mô tả chỉ số)
        if (passivesFilterState.search) {
            const query = passivesFilterState.search;
            const matchName = item.name.toLowerCase().includes(query) || (item.name_en && item.name_en.toLowerCase().includes(query)) || (item.name_vi && item.name_vi.toLowerCase().includes(query));
            const matchDesc = item.desc && item.desc.toLowerCase().includes(query);
            return matchName || matchDesc;
        }

        return true;
    });

    // Sắp xếp
    filtered.sort((a, b) => {
        switch (passivesFilterState.sortBy) {
            case "tier_desc":
                if (b.tier !== a.tier) return b.tier - a.tier;
                return a.name_en.localeCompare(b.name_en);
            case "tier_asc":
                if (a.tier !== b.tier) return a.tier - b.tier;
                return a.name_en.localeCompare(b.name_en);
            case "name_asc":
                return a.name_en.localeCompare(b.name_en);
            case "name_desc":
                return b.name_en.localeCompare(a.name_en);
            default:
                return 0;
        }
    });

    // Cập nhật số lượng hiển thị
    const visibleEl = document.getElementById("passives-visible-count");
    if (visibleEl) visibleEl.textContent = filtered.length;

    renderPassivesGrid(filtered);
}

function renderPassivesGrid(items) {
    const grid = document.getElementById("passives-grid");
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1;">
                <i class="fa-solid fa-shield-slash empty-icon"></i>
                <h3>Không tìm thấy Kỹ năng bị động nào phù hợp!</h3>
                <p>Hãy thử từ khóa tìm kiếm khác hoặc đổi nhóm kỹ năng.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => {
        let rankClass = "rank-normal";
        if (item.tier === 5) rankClass = "rank-5";
        else if (item.tier === 4) rankClass = "rank-4";
        else if (item.tier === 3) rankClass = "rank-3";
        else if (item.tier < 0) rankClass = "rank-negative";

        let tierClass = "tier-normal";
        if (item.tier === 5) tierClass = "tier-5";
        else if (item.tier === 4) tierClass = "tier-4";
        else if (item.tier === 3) tierClass = "tier-3";
        else if (item.tier < 0) tierClass = "tier-negative";

        const catBadge = item.is_pal 
            ? `<span class="passive-cat-tag pal"><i class="fa-solid fa-paw"></i> Pal</span>` 
            : `<span class="passive-cat-tag"><i class="fa-solid fa-globe"></i> Mở rộng</span>`;

        return `
            <div class="passive-card ${tierClass}">
                <div>
                    <div class="passive-header">
                        <span class="passive-rank-badge ${rankClass}">
                            <i class="fa-solid ${item.tier < 0 ? 'fa-arrow-down-long' : 'fa-star'}"></i> ${item.rank_label}
                        </span>
                        ${catBadge}
                    </div>
                    <div class="passive-name">${item.name}</div>
                </div>
                <div class="passive-desc">${item.desc || 'Không có mô tả chi tiết'}</div>
            </div>
        `;
    }).join("");
}

