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
    partnerSearch: "",        // Từ khóa tìm kiếm Kỹ năng đồng hành (Partner Skill)
    partnerCategories: [],    // Các nhóm thẻ Kỹ năng đồng hành đã chọn
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

// Hàm hỗ trợ lấy cấp độ kỹ năng làm việc (chuẩn hóa cả trường hợp có hoặc không có khoảng trắng như medicine production vs medicineproduction)
function getPalWorkLevel(pal, workKey) {
    if (!pal || !pal.work_suitability) return 0;
    const works = pal.work_suitability;
    if (works[workKey] !== undefined) return Number(works[workKey]) || 0;
    
    const normKey = String(workKey).replace(/[\s_]+/g, "").toLowerCase();
    for (let k in works) {
        const normK = String(k).replace(/[\s_]+/g, "").toLowerCase();
        if (normK === normKey) {
            return Number(works[k]) || 0;
        }
        if ((normKey.includes("electr") && normK.includes("electr")) ||
            (normKey.includes("medicine") && normK.includes("medicine"))) {
            return Number(works[k]) || 0;
        }
    }
    return 0;
}

// Hàm hỗ trợ lấy thông tin icon và tên kỹ năng (chuẩn hóa cả trường hợp có hoặc không có khoảng trắng)
function getWorkInfo(wType) {
    if (WORK_INFO[wType]) return WORK_INFO[wType];
    const normKey = String(wType).replace(/[\s_]+/g, "").toLowerCase();
    for (let k in WORK_INFO) {
        const normK = String(k).replace(/[\s_]+/g, "").toLowerCase();
        if (normK === normKey ||
            (normKey.includes("electr") && normK.includes("electr")) ||
            (normKey.includes("medicine") && normK.includes("medicine"))) {
            return WORK_INFO[k];
        }
    }
    return { name: wType, icon: "fa-hammer" };
}

// ============================================================================
// CƠ CHẾ AI SMART FINDER: ĐỌC HIỂU & PHÂN LOẠI KỸ NĂNG ĐỒNG HÀNH (PARTNER SKILLS)
// ============================================================================
function matchesPartnerCategory(pal, fullPsText, cat) {
    const ps = pal.partner_skill || {};
    const psName = (ps.name || "").toLowerCase();
    const psDesc = (ps.description || "").toLowerCase();
    const runSpeed = pal.mount_speed ? (pal.mount_speed.run_speed || 0) : 0;
    const flySpeed = pal.mount_speed ? (pal.mount_speed.fly_speed || 0) : 0;

    switch (cat) {
        case "mount_land":
            return runSpeed > 0 || fullPsText.includes("can be ridden") || fullPsText.includes("sprint") || fullPsText.includes("mounted") || fullPsText.includes("cưỡi");
        case "mount_fly":
            return flySpeed > 0 || fullPsText.includes("flying mount") || fullPsText.includes("fly") || fullPsText.includes("aerial") || fullPsText.includes("cưỡi bay");
        case "mount_water":
            return fullPsText.includes("water mount") || fullPsText.includes("swim") || fullPsText.includes("bơi") || fullPsText.includes("lướt nước");
        case "glider":
            return fullPsText.includes("glider") || fullPsText.includes("parachute") || fullPsText.includes("glide") || fullPsText.includes("dù lượn");
        case "weapon":
            return fullPsText.includes("shotgun") || fullPsText.includes("grenade") || fullPsText.includes("missile") || fullPsText.includes("launcher") || fullPsText.includes("assault rifle") || fullPsText.includes("flamethrower") || fullPsText.includes("gun") || fullPsText.includes("cannon") || fullPsText.includes("rapid fire") || fullPsText.includes("bazooka") || fullPsText.includes("bomb") || fullPsText.includes("súng") || fullPsText.includes("tên lửa") || fullPsText.includes("pháo");
        case "buff_atk":
            return fullPsText.includes("attack") || fullPsText.includes("damage") || fullPsText.includes("multiplier") || fullPsText.includes("weak point") || fullPsText.includes("increases player's attack") || fullPsText.includes("increases attack") || fullPsText.includes("sát thương") || fullPsText.includes("tấn công");
        case "buff_def":
            return fullPsText.includes("restores hp") || fullPsText.includes("heal") || fullPsText.includes("health") || fullPsText.includes("defense") || fullPsText.includes("shield") || fullPsText.includes("life drain") || fullPsText.includes("blessing") || fullPsText.includes("damage reduction") || fullPsText.includes("hồi máu") || fullPsText.includes("khiên") || fullPsText.includes("phòng thủ");
        case "weight":
            return fullPsText.includes("weight") || fullPsText.includes("carry capacity") || fullPsText.includes("hauler") || fullPsText.includes("carrier") || fullPsText.includes("ore") || fullPsText.includes("coal") || fullPsText.includes("sulfur") || fullPsText.includes("giảm trọng lượng");
        case "drops":
            return fullPsText.includes("drops extra items") || fullPsText.includes("drops more items") || fullPsText.includes("when defeated") || fullPsText.includes("harvest") || fullPsText.includes("bless the crops") || fullPsText.includes("ranch") || fullPsText.includes("gold coin") || fullPsText.includes("digs up") || (pal.ranch_drops && pal.ranch_drops.length > 0);
        case "infuse":
            return fullPsText.includes("changes the player's attack type") || fullPsText.includes("changes player's attack") || fullPsText.includes("applies fire") || fullPsText.includes("applies ice") || fullPsText.includes("applies dark") || fullPsText.includes("applies electric") || fullPsText.includes("applies water") || fullPsText.includes("applies grass") || fullPsText.includes("applies dragon") || fullPsText.includes("applies ground") || fullPsText.includes("infuse") || fullPsText.includes("đổi hệ");
        case "radar":
            return fullPsText.includes("detects") || fullPsText.includes("locates") || fullPsText.includes("radar") || fullPsText.includes("nearby dungeons") || fullPsText.includes("rare pals") || fullPsText.includes("eggs") || fullPsText.includes("dò tìm");
        default:
            return false;
    }
}

function checkPartnerSkillMatch(pal, searchQuery, categories) {
    const ps = pal.partner_skill || {};
    const psName = (ps.name || "").toLowerCase();
    const psDesc = (ps.description || "").toLowerCase();
    const levelsText = (ps.levels || []).map(l => (l.value || "")).join(" ").toLowerCase();
    const mountInfo = pal.mount_speed ? "mount ride ridden can be ridden sprint speed thú cưỡi" : "";
    const ranchInfo = (pal.ranch_drops && pal.ranch_drops.length > 0) ? "ranch farming drops harvest chăn thả rớt đồ" : "";
    const fullPsText = [psName, psDesc, levelsText, mountInfo, ranchInfo, pal.name.toLowerCase()].join(" ");

    // 1. Kiểm tra theo từ khóa tìm kiếm (Keyword / Fuzzy matching)
    if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        let matchQuery = fullPsText.includes(q);

        // Hỗ trợ từ khóa tiếng Việt tương đương & từ khóa gợi nhớ mờ
        if (!matchQuery) {
            if (q.includes("bay") || q.includes("lượn") || q.includes("fly")) {
                matchQuery = fullPsText.includes("fly") || fullPsText.includes("flying") || fullPsText.includes("glider") || fullPsText.includes("glide") || fullPsText.includes("aerial");
            } else if (q.includes("cưỡi") || q.includes("ngựa") || q.includes("ride") || q.includes("mount")) {
                matchQuery = fullPsText.includes("can be ridden") || fullPsText.includes("mount") || (pal.mount_speed && pal.mount_speed.run_speed > 0);
            } else if (q.includes("súng") || q.includes("bắn") || q.includes("đạn") || q.includes("tên lửa") || q.includes("pháo") || q.includes("gun") || q.includes("rocket") || q.includes("missile")) {
                matchQuery = fullPsText.includes("shotgun") || fullPsText.includes("grenade") || fullPsText.includes("missile") || fullPsText.includes("rifle") || fullPsText.includes("flamethrower") || fullPsText.includes("gun") || fullPsText.includes("cannon") || fullPsText.includes("bomb") || fullPsText.includes("weapon");
            } else if (q.includes("hồi máu") || q.includes("máu") || q.includes("heal") || q.includes("hp")) {
                matchQuery = fullPsText.includes("restores hp") || fullPsText.includes("heal") || fullPsText.includes("health") || fullPsText.includes("life drain");
            } else if (q.includes("khiên") || q.includes("phòng thủ") || q.includes("giáp") || q.includes("shield") || q.includes("def")) {
                matchQuery = fullPsText.includes("defense") || fullPsText.includes("shield") || fullPsText.includes("damage reduction");
            } else if (q.includes("quặng") || q.includes("đá") || q.includes("giảm cân") || q.includes("trọng lượng") || q.includes("nặng") || q.includes("weight") || q.includes("ore")) {
                matchQuery = fullPsText.includes("weight") || fullPsText.includes("ore") || fullPsText.includes("coal") || fullPsText.includes("sulfur") || fullPsText.includes("carry capacity");
            } else if (q.includes("rơi") || q.includes("rớt") || q.includes("drop") || q.includes("farm") || q.includes("ranch")) {
                matchQuery = fullPsText.includes("drops extra items") || fullPsText.includes("when defeated") || fullPsText.includes("ranch") || (pal.ranch_drops && pal.ranch_drops.length > 0);
            } else if (q.includes("radar") || q.includes("dò") || q.includes("tìm") || q.includes("detect")) {
                matchQuery = fullPsText.includes("detects") || fullPsText.includes("locates") || fullPsText.includes("radar") || fullPsText.includes("dungeon");
            } else {
                // Kiểm tra tách từ: nếu tất cả từ trong câu query đều xuất hiện trong fullPsText
                const words = q.split(/\s+/).filter(w => w.length > 1);
                if (words.length > 1) {
                    matchQuery = words.every(w => fullPsText.includes(w));
                }
            }
        }
        if (!matchQuery) return false;
    }

    // 2. Kiểm tra theo nhóm thẻ phân loại (Category chips)
    if (categories && categories.length > 0) {
        // Chế độ HOẶC: Pal khớp với ít nhất 1 thẻ được chọn
        const matchAnyCat = categories.some(cat => matchesPartnerCategory(pal, fullPsText, cat));
        if (!matchAnyCat) return false;
    }

    return true;
}

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

        // Khởi tạo hệ thống Xây dựng & Tính chỉ số Pal (Build Your Pals)
        initBuildSystem();

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
            for (let work of filterState.works) {
                const palLevel = getPalWorkLevel(pal, work);
                if (palLevel < 1) {
                    return false; // Pal phải có kỹ năng được chọn (ít nhất Lv 1)
                }
            }
        }

        // --- Lọc theo Kỹ năng đồng hành (Partner Skill AI Smart Filter) ---
        if (filterState.partnerSearch || (filterState.partnerCategories && filterState.partnerCategories.length > 0)) {
            if (!checkPartnerSkillMatch(pal, filterState.partnerSearch, filterState.partnerCategories)) {
                return false;
            }
        }

        return true;
    });

    // 2. Bước Sắp xếp (Sorting)
    filtered.sort((a, b) => {
        // --- Ưu tiên sắp xếp theo Cấp độ Kỹ năng làm việc (nếu bật) ---
        if (filterState.workSortOrder !== "none") {
            const dir = filterState.workSortOrder === "desc" ? -1 : 1;

            if (filterState.works.length > 0) {
                // Duyệt qua từng kỹ năng theo thứ tự "ghi nhớ ẩn" (works[0], works[1]...) mà người dùng đã chọn
                // Kỹ năng nào được chọn trước sẽ được ưu tiên so sánh cấp độ trước
                for (let work of filterState.works) {
                    const levelA = getPalWorkLevel(a, work);
                    const levelB = getPalWorkLevel(b, work);
                    if (levelA !== levelB) {
                        return (levelA - levelB) * dir;
                    }
                }
            } else {
                // Nếu chưa chọn kỹ năng cụ thể nào, lấy cấp độ cao nhất trong các kỹ năng của Pal
                const levelsA = Object.keys(a.work_suitability || {}).map(k => getPalWorkLevel(a, k));
                const levelsB = Object.keys(b.work_suitability || {}).map(k => getPalWorkLevel(b, k));
                const maxA = levelsA.length > 0 ? Math.max(...levelsA) : 0;
                const maxB = levelsB.length > 0 ? Math.max(...levelsB) : 0;
                if (maxA !== maxB) {
                    return (maxA - maxB) * dir;
                }
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

        if (sortField === "hp" || sortField === "atk" || sortField === "def" || sortField === "melee" || sortField === "support" || sortField === "stamina" || sortField === "price") {
            const statsA = a.stats || {};
            const statsB = b.stats || {};
            let key = sortField;
            if (sortField === "atk") key = "attack";
            if (sortField === "def") key = "defense";
            if (sortField === "melee") key = "melee_attack";
            const valA = statsA[key] || 0;
            const valB = statsB[key] || 0;
            return (valA - valB) * dir;
        }

        if (sortField === "speed" || sortField === "sprint") {
            const statsA = a.stats || {};
            const statsB = b.stats || {};
            const mountA = a.mount_speed || {};
            const mountB = b.mount_speed || {};
            const speedA = sortField === "sprint" ? (statsA.sprint_speed || mountA.sprint_speed || 0) : (statsA.run_speed || mountA.run_speed || 0);
            const speedB = sortField === "sprint" ? (statsB.sprint_speed || mountB.sprint_speed || 0) : (statsB.run_speed || mountB.run_speed || 0);
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
            const info = getWorkInfo(wType);
            const iconHTML = info.img ? `<img src="${info.img}" class="badge-icon" alt="${info.name}">` : `<i class="fa-solid ${info.icon}"></i>`;
            return `<span class="badge-work" title="${info.name} Cấp ${wLevel}">${iconHTML} ${info.name}: <strong>Cấp ${wLevel}</strong></span>`;
        }).join("");

        // Render Huy hiệu Nội tại / Kỹ năng đồng hành trên Thẻ (Partner Skill Summary)
        const ps = pal.partner_skill || {};
        const psName = ps.name || "";
        const psDescShort = ps.description ? (ps.description.length > 68 ? ps.description.substring(0, 68) + "..." : ps.description) : "";
        const psHTML = psName ? `
            <div class="pal-ps-badge" title="${psName}: ${ps.description || ''}" style="margin: 6px 12px 0; padding: 4px 8px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 6px; font-size: 0.77rem; color: #fcd34d; display: flex; align-items: center; gap: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                <i class="fa-solid fa-wand-magic-sparkles" style="color:#f59e0b; flex-shrink:0;"></i>
                <span style="overflow: hidden; text-overflow: ellipsis;"><strong>${psName}</strong>${psDescShort ? ` - <span style="color:#cbd5e1; font-size:0.73rem;">${psDescShort}</span>` : ''}</span>
            </div>
        ` : '';

        // Chỉ số tóm tắt bên dưới thẻ
        const stats = pal.stats || {};
        const hp = stats.hp || "-";
        const atk = stats.attack || "-";
        const melee = stats.melee_attack || "-";
        const def = stats.defense || "-";
        const workSpeed = stats.support || 100;
        const sprint = stats.sprint_speed || (pal.mount_speed ? pal.mount_speed.sprint_speed : "-") || "-";

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
                ${psHTML}
                <div class="pal-works">
                    ${worksHTML || '<span class="badge-work" style="opacity:0.5;">Không có kỹ năng làm việc</span>'}
                </div>

                <div class="pal-stats-footer" style="grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 0.5rem;">
                    <div class="stat-box" title="Sinh lực cơ bản (Base HP)">
                        <span class="stat-label">❤️ HP</span>
                        <span class="stat-val hp">${hp}</span>
                    </div>
                    <div class="stat-box" title="Tấn công tầm xa (Shot Attack)">
                        <span class="stat-label">🏹 ATK</span>
                        <span class="stat-val atk">${atk}</span>
                    </div>
                    <div class="stat-box" title="Tấn công cận chiến (Melee Attack)">
                        <span class="stat-label">⚔️ Melee</span>
                        <span class="stat-val" style="color:#f97316;">${melee}</span>
                    </div>
                    <div class="stat-box" title="Phòng thủ cơ bản (Defense)">
                        <span class="stat-label">🛡️ DEF</span>
                        <span class="stat-val def">${def}</span>
                    </div>
                    <div class="stat-box" title="Tốc độ làm việc nền (Support / Work Speed)">
                        <span class="stat-label">🛠️ Work</span>
                        <span class="stat-val" style="color:#60a5fa;">${workSpeed}</span>
                    </div>
                    <div class="stat-box" title="Tốc độ lướt nhanh nhất (Sprint Speed)">
                        <span class="stat-label">🚀 Sprint</span>
                        <span class="stat-val speed">${sprint}</span>
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
            if (filterState.works.length > 0 && filterState.workSortOrder === "none") {
                filterState.workSortOrder = "desc";
                const sortSelect = document.getElementById("work-sort-order");
                if (sortSelect) sortSelect.value = "desc";
            }
            applyFiltersAndRender();
        });
    });

    // Sắp xếp theo cấp độ kỹ năng làm việc
    document.getElementById("work-sort-order").addEventListener("change", (e) => {
        filterState.workSortOrder = e.target.value;
        applyFiltersAndRender();
    });

    // 4.5. Lọc & Tìm kiếm Kỹ năng đồng hành (Partner Skills Smart Filter)
    const partnerSearchInput = document.getElementById("partner-skill-search");
    const clearPartnerBtn = document.getElementById("clear-partner-search");
    if (partnerSearchInput) {
        partnerSearchInput.addEventListener("input", (e) => {
            filterState.partnerSearch = e.target.value.trim();
            if (filterState.partnerSearch) {
                clearPartnerBtn.classList.remove("hidden");
            } else {
                clearPartnerBtn.classList.add("hidden");
            }
            applyFiltersAndRender();
        });
        clearPartnerBtn.addEventListener("click", () => {
            partnerSearchInput.value = "";
            filterState.partnerSearch = "";
            clearPartnerBtn.classList.add("hidden");
            applyFiltersAndRender();
        });
    }

    const partnerChips = document.querySelectorAll(".partner-chip");
    partnerChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const partner = chip.dataset.partner;
            if (filterState.partnerCategories.includes(partner)) {
                filterState.partnerCategories = filterState.partnerCategories.filter(p => p !== partner);
                chip.classList.remove("active");
            } else {
                filterState.partnerCategories.push(partner);
                chip.classList.add("active");
            }
            applyFiltersAndRender();
        });
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
            partnerSearch: "",
            partnerCategories: [],
            mountOnly: false,
            sortBy: "id-asc"
        };

        // UI Reset
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        if (partnerSearchInput) partnerSearchInput.value = "";
        if (clearPartnerBtn) clearPartnerBtn.classList.add("hidden");
        document.getElementById("sort-select").value = "id-asc";
        document.getElementById("work-sort-order").value = "desc";

        elementChips.forEach(c => c.classList.remove("active"));
        document.querySelector('.element-chip[data-element="all"]').classList.add("active");

        btnOR.classList.add("active");
        btnAND.classList.remove("active");

        workChips.forEach(c => c.classList.remove("active"));
        partnerChips.forEach(c => c.classList.remove("active"));
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
        const info = getWorkInfo(wType);
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

        <div class="modal-section-title"><i class="fa-solid fa-chart-line text-blue-400"></i> Thông số chiến đấu & Thể chất cơ bản (Base Combat & Biology Stats)</div>
        <div class="modal-grid-stats detailed-grid">
            <div class="modal-stat-card border-l-4 border-l-red-500">
                <span class="label">❤️ Sinh lực cơ bản (Base HP)</span>
                <span class="val" style="color:#f87171;">${stats.hp || "-"}</span>
                <span class="sub-desc">Tối đa Lv.80: ${stats.max_hp || 'N/A'}</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-orange-500">
                <span class="label">🏹 Tấn công tầm xa (Shot Attack)</span>
                <span class="val" style="color:#fb923c;">${stats.attack || "-"}</span>
                <span class="sub-desc">Tối đa Lv.80: ${stats.max_attack || 'N/A'}</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-amber-500">
                <span class="label">⚔️ Tấn công cận chiến (Melee Attack)</span>
                <span class="val" style="color:#f59e0b;">${stats.melee_attack || "-"}</span>
                <span class="sub-desc">Sát thương kỹ năng tầm gần</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-sky-500">
                <span class="label">🛡️ Phòng thủ cơ bản (Defense)</span>
                <span class="val" style="color:#38bdf8;">${stats.defense || "-"}</span>
                <span class="sub-desc">Tối đa Lv.80: ${stats.max_defense || 'N/A'}</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-indigo-500">
                <span class="label">🛠️ Hỗ trợ & Tốc độ làm việc (Support)</span>
                <span class="val" style="color:#818cf8;">${stats.support || 100}</span>
                <span class="sub-desc">Nền tảng tốc độ xây/chế tạo</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-purple-500">
                <span class="label">⚡ Dung lượng thể lực (Stamina)</span>
                <span class="val" style="color:#c084fc;">${stats.stamina || 100}</span>
                <span class="sub-desc">Tiêu hao khi lướt/bay/tấn công</span>
            </div>
        </div>

        <div class="modal-section-title"><i class="fa-solid fa-gauge-high text-yellow-400"></i> Tốc độ di chuyển & Giá trị sinh học (Movement Speeds & Biology)</div>
        <div class="modal-grid-stats detailed-grid">
            <div class="modal-stat-card border-l-4 border-l-yellow-400">
                <span class="label">🚀 Tốc độ lướt / Nhanh (Sprint Speed)</span>
                <span class="val" style="color:#facc15;">${stats.sprint_speed || (mount.sprint_speed > 0 ? mount.sprint_speed : "-")}</span>
                <span class="sub-desc">Tốc độ tối đa khi cưỡi nước rút</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-amber-400">
                <span class="label">🐎 Tốc độ chạy thường (Running Speed)</span>
                <span class="val" style="color:#fbbf24;">${stats.run_speed || (mount.run_speed > 0 ? mount.run_speed : "-")}</span>
                <span class="sub-desc">Tốc độ di chuyển tiêu chuẩn</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-stone-400">
                <span class="label">🐢 Tốc độ đi bộ (Slow Walk Speed)</span>
                <span class="val" style="color:#a8a29e;">${stats.slow_walk_speed || 50}</span>
                <span class="sub-desc">Tốc độ khi mang vác quá tải</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-emerald-400">
                <span class="label">💰 Giá bán tiêu chuẩn (Gold Coin Price)</span>
                <span class="val" style="color:#34d399;">${(stats.price || 100).toLocaleString('vi-VN')} Vàng</span>
                <span class="sub-desc">Phẩm chất (Rarity): Rank ${stats.rarity || 1}</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-pink-400">
                <span class="label">🍖 Lượng thức ăn & Chỉ số đói (Food Bar)</span>
                <span class="val" style="color:#f472b6;">${stats.food || 100} điểm</span>
                <span class="sub-desc">Tiêu thụ: ${stats.food_amount || 1} 🍞 | Size: ${stats.size || 'M'}</span>
            </div>
            <div class="modal-stat-card border-l-4 border-l-cyan-400">
                <span class="label">⚖️ Tỉ lệ giới tính (Gender Ratio)</span>
                <span class="val" style="color:#22d3ee; font-size:1.1rem;">♂️ ${stats.male_prob || 50}% / ♀️ ${100 - (stats.male_prob || 50)}%</span>
                <span class="sub-desc">Tỉ lệ sinh ra đực/cái khi lai tạo</span>
            </div>
        </div>

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
    const tabBuild = document.getElementById("tab-btn-build");
    const viewPals = document.getElementById("view-pals");
    const viewMaps = document.getElementById("view-maps");
    const viewPassives = document.getElementById("view-passives");
    const viewBuild = document.getElementById("view-build");

    function switchTab(mode) {
        currentMode = mode;
        if (tabPals) tabPals.classList.toggle("active", mode === "pals");
        if (tabMaps) tabMaps.classList.toggle("active", mode === "maps");
        if (tabPassives) tabPassives.classList.toggle("active", mode === "passives");
        if (tabBuild) tabBuild.classList.toggle("active", mode === "build");

        if (viewPals) viewPals.classList.toggle("hidden", mode !== "pals");
        if (viewMaps) viewMaps.classList.toggle("hidden", mode !== "maps");
        if (viewPassives) viewPassives.classList.toggle("hidden", mode !== "passives");
        if (viewBuild) viewBuild.classList.toggle("hidden", mode !== "build");

        if (mode === "maps") {
            if (!leafletMap) {
                setupLeafletMap();
            } else {
                setTimeout(() => leafletMap.invalidateSize(), 150);
            }
        } else if (mode === "build") {
            if (!buildState.selectedPalId && PALS_DATA.length > 0) {
                buildState.selectedPalId = PALS_DATA[0].id;
            }
            updateBuildUI();
        }
    }

    if (tabPals) tabPals.addEventListener("click", () => switchTab("pals"));
    if (tabMaps) tabMaps.addEventListener("click", () => switchTab("maps"));
    if (tabPassives) tabPassives.addEventListener("click", () => switchTab("passives"));
    if (tabBuild) tabBuild.addEventListener("click", () => switchTab("build"));

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
function removeVietnameseTones(str) {
    if (!str) return "";
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase();
}

let allPassivesData = [];
let passivesFilterState = {
    search: "",
    category: "pal", // "pal" (chỉ Pal 114 kỹ năng) hoặc "all" (tất cả 309 kỹ năng)
    utilityTag: "all", // "all", "attack", "defense", "work", "speed", "stamina", "san", "hunger", "hp", "element", "cooldown", "harvest"
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

    // 4. Gắn sự kiện chọn lọc nhanh công dụng (Quick Utility Tags)
    const utilChips = document.querySelectorAll(".passive-utility-chip");
    utilChips.forEach(chip => {
        chip.addEventListener("click", () => {
            utilChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            passivesFilterState.utilityTag = chip.dataset.utility;
            applyPassivesFiltersAndRender();
        });
    });

    // 5. Render lần đầu
    applyPassivesFiltersAndRender();
}

function applyPassivesFiltersAndRender() {
    if (!allPassivesData || allPassivesData.length === 0) return;

    let filtered = allPassivesData.filter(item => {
        // Lọc theo nhóm (category)
        if (passivesFilterState.category === "pal" && !item.is_pal) {
            return false;
        }

        // Gom toàn bộ nội dung tên và mô tả chi tiết để tìm kiếm (cả VI, EN và công dụng)
        const fullTextOriginal = [
            item.name || "",
            item.name_vi || "",
            item.name_en || "",
            item.desc || "",
            item.desc_vi || "",
            item.desc_en || ""
        ].join(" ").toLowerCase();

        const fullTextNoTones = removeVietnameseTones(fullTextOriginal);

        // Lọc nhanh theo Utility Tag chip
        if (passivesFilterState.utilityTag && passivesFilterState.utilityTag !== "all") {
            const tag = passivesFilterState.utilityTag;
            let tagMatch = false;
            if (tag === "attack") tagMatch = fullTextOriginal.includes("tấn công") || fullTextOriginal.includes("attack") || fullTextOriginal.includes("sát thương") || fullTextOriginal.includes("damage");
            if (tag === "defense") tagMatch = fullTextOriginal.includes("phòng thủ") || fullTextOriginal.includes("defense") || fullTextOriginal.includes("giáp") || fullTextOriginal.includes("chịu sát thương");
            if (tag === "work") tagMatch = fullTextOriginal.includes("tốc độ làm việc") || fullTextOriginal.includes("work speed") || fullTextOriginal.includes("chặt cây") || fullTextOriginal.includes("đào đá") || fullTextOriginal.includes("khai thác");
            if (tag === "speed") tagMatch = fullTextOriginal.includes("tốc độ di chuyển") || fullTextOriginal.includes("movement speed") || fullTextOriginal.includes("nhanh nhẹn") || fullTextOriginal.includes("tốc độ cưỡi");
            if (tag === "stamina") tagMatch = fullTextOriginal.includes("thể lực") || fullTextOriginal.includes("stamina");
            if (tag === "san") tagMatch = fullTextOriginal.includes("minh mẫn") || fullTextOriginal.includes("san");
            if (tag === "hunger") tagMatch = fullTextOriginal.includes("mức độ no") || fullTextOriginal.includes("hunger") || fullTextOriginal.includes("đói");
            if (tag === "hp") tagMatch = fullTextOriginal.includes("máu tối đa") || fullTextOriginal.includes("max health") || fullTextOriginal.includes("sinh lực") || fullTextOriginal.includes("hp");
            if (tag === "element") tagMatch = fullTextOriginal.includes("sát thương hệ") || fullTextOriginal.includes("sát thương rồng") || fullTextOriginal.includes("sát thương lửa") || fullTextOriginal.includes("sát thương băng") || fullTextOriginal.includes("sát thương bóng tối") || fullTextOriginal.includes("sát thương thảo") || fullTextOriginal.includes("sát thương nước") || fullTextOriginal.includes("sát thương lôi") || fullTextOriginal.includes("sát thương đất") || fullTextOriginal.includes("dragon") || fullTextOriginal.includes("fire") || fullTextOriginal.includes("ice") || fullTextOriginal.includes("dark") || fullTextOriginal.includes("grass") || fullTextOriginal.includes("water") || fullTextOriginal.includes("electric") || fullTextOriginal.includes("ground");
            if (tag === "cooldown") tagMatch = fullTextOriginal.includes("hồi chiêu") || fullTextOriginal.includes("cool time") || fullTextOriginal.includes("cooldown");
            if (tag === "harvest") tagMatch = fullTextOriginal.includes("chặt cây") || fullTextOriginal.includes("đào đá") || fullTextOriginal.includes("cây thế giới") || fullTextOriginal.includes("harvestables");

            if (!tagMatch) return false;
        }

        // Lọc theo từ khóa tìm kiếm trong ô input
        if (passivesFilterState.search) {
            const query = passivesFilterState.search.trim().toLowerCase();
            const queryNoTones = removeVietnameseTones(query);

            // Tách các từ khóa (keywords) để hỗ trợ tìm kiếm AND (tất cả các từ khóa người dùng gõ phải có mặt trong tên hoặc mô tả công dụng)
            // Ví dụ gõ "làm việc -20" hay "toc do minh man" hay "attack 20%"
            const tokens = query.split(/\s+/).filter(Boolean);
            const tokensNoTones = queryNoTones.split(/\s+/).filter(Boolean);

            const allTokensMatched = tokens.every((token, idx) => {
                const tokenNoTone = tokensNoTones[idx] || token;
                return fullTextOriginal.includes(token) || fullTextNoTones.includes(tokenNoTone);
            });

            if (!allTokensMatched) return false;
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

// ============================================================================
// HỆ THỐNG XÂY DỰNG & TÍNH CHỈ SỐ PALS (BUILD YOUR PALS)
// ============================================================================
let buildState = {
    selectedPalId: "",
    level: 80,
    rank: 0.20,
    iv: 15,
    soulHp: 0,   // Level 0 - 10
    soulAtk: 0,  // Level 0 - 10
    soulDef: 0,  // Level 0 - 10
    soulWork: 0, // Level 0 - 20
    equippedPassives: [] // mảng chứa tối đa 4 object kỹ năng bị động
};

function extractPassiveModifiers(item) {
    if (!item) return { atk: 0, def: 0, hp: 0, work: 0, speed: 0 };
    const text = (item.desc_vi || item.desc || item.desc_en || '').replace(/ %/g, '%').replace(/,0%/g, '%').toLowerCase();
    
    let atk = 0, def = 0, hp = 0, work = 0, speed = 0;
    
    const atkMatches = [...text.matchAll(/(?:tấn công|attack)\s*([+-]?\s*\d+(?:\.\d+)?)%/g)];
    atkMatches.forEach(m => atk += parseFloat(m[1].replace(/\s+/g, '')));
    
    const defMatches = [...text.matchAll(/(?:phòng thủ|defense)\s*([+-]?\s*\d+(?:\.\d+)?)%/g)];
    defMatches.forEach(m => def += parseFloat(m[1].replace(/\s+/g, '')));
    
    const hpMatches = [...text.matchAll(/(?:máu tối đa|max health|hp|sinh lực)\s*([+-]?\s*\d+(?:\.\d+)?)%/g)];
    hpMatches.forEach(m => hp += parseFloat(m[1].replace(/\s+/g, '')));
    
    const workMatches = [...text.matchAll(/(?:tốc độ làm việc|work speed)\s*([+-]?\s*\d+(?:\.\d+)?)%/g)];
    workMatches.forEach(m => work += parseFloat(m[1].replace(/\s+/g, '')));
    
    const speedMatches = [...text.matchAll(/(?:tốc độ di chuyển|movement speed)\s*([+-]?\s*\d+(?:\.\d+)?)%/g)];
    speedMatches.forEach(m => speed += parseFloat(m[1].replace(/\s+/g, '')));
    
    if (speed === 0) {
        const speedMatches2 = [...text.matchAll(/(tăng|giảm)\s*tốc độ di chuyển\s*(\d+(?:\.\d+)?)%/g)];
        speedMatches2.forEach(m => {
            const val = parseFloat(m[2]);
            speed += (m[1] === 'tăng' ? val : -val);
        });
    }

    return { atk, def, hp, work, speed };
}

function initBuildSystem() {
    const palSelect = document.getElementById("build-pal-select");
    const palSearch = document.getElementById("build-pal-search");
    const passiveDropdown = document.getElementById("build-passive-dropdown");
    const passiveSearch = document.getElementById("build-passive-search");
    const btnAddPassive = document.getElementById("btn-add-passive");
    
    const levelSlider = document.getElementById("build-level");
    const rankSelect = document.getElementById("build-rank");
    const ivSlider = document.getElementById("build-iv");
    
    const soulHpSlider = document.getElementById("build-soul-hp");
    const soulAtkSlider = document.getElementById("build-soul-atk");
    const soulDefSlider = document.getElementById("build-soul-def");
    const soulWorkSlider = document.getElementById("build-soul-work");
    const btnResetSouls = document.getElementById("btn-reset-souls");
    
    const btnReset = document.getElementById("btn-reset-build");
    const btnSave = document.getElementById("btn-save-build");
    const btnClearSaved = document.getElementById("btn-clear-all-builds");

    // Populate Pal Selector
    if (palSelect && allPals.length > 0) {
        const sortedPals = [...allPals].sort((a, b) => a.name.localeCompare(b.name));
        palSelect.innerHTML = sortedPals.map(p => `<option value="${p.id}">#${p.id || '?'} - ${p.name}</option>`).join("");
        if (!buildState.selectedPalId) {
            buildState.selectedPalId = sortedPals[0].id;
        } else {
            palSelect.value = buildState.selectedPalId;
        }
    }

    // Pal search typing
    if (palSearch && palSelect) {
        palSearch.addEventListener("input", (e) => {
            const q = e.target.value.trim().toLowerCase();
            if (!q) return;
            const match = allPals.find(p => p.name.toLowerCase().includes(q) || String(p.id) === q || (p.code && p.code.toLowerCase().includes(q)));
            if (match) {
                palSelect.value = match.id;
                buildState.selectedPalId = match.id;
                updateBuildUI();
            }
        });
    }

    if (palSelect) {
        palSelect.addEventListener("change", (e) => {
            buildState.selectedPalId = e.target.value;
            updateBuildUI();
        });
    }

    // Populate Passive Dropdown
    function populateBuildPassivesDropdown(query = "") {
        if (!passiveDropdown) return;
        let passivesToList = allPassivesData && allPassivesData.length > 0 ? allPassivesData : [];
        if (query) {
            const qLower = removeVietnameseTones(query.toLowerCase());
            passivesToList = passivesToList.filter(item => {
                const full = removeVietnameseTones([item.name, item.name_vi, item.desc, item.desc_vi].join(" ").toLowerCase());
                return full.includes(qLower);
            });
        }
        passiveDropdown.innerHTML = `<option value="">-- Chọn kỹ năng để lắp vào Slot trống (${passivesToList.length} kỹ năng) --</option>` +
            passivesToList.map(item => `<option value="${item.id}">${item.name} (${item.rank_label}) - ${item.desc_vi || item.desc || ''}</option>`).join("");
    }

    populateBuildPassivesDropdown();

    if (passiveSearch) {
        passiveSearch.addEventListener("input", (e) => {
            populateBuildPassivesDropdown(e.target.value.trim());
        });
    }

    // Add passive
    if (btnAddPassive && passiveDropdown) {
        btnAddPassive.addEventListener("click", () => {
            const selectedId = passiveDropdown.value;
            if (!selectedId) {
                alert("Vui lòng chọn một Kỹ năng bị động từ danh sách dropdown trước khi bấm Thêm!");
                return;
            }
            if (buildState.equippedPassives.length >= 4) {
                alert("Mỗi Pal chỉ có thể trang bị tối đa 4 Kỹ năng bị động theo đúng cơ chế Palworld!");
                return;
            }
            const passiveObj = allPassivesData.find(item => item.id === selectedId);
            if (passiveObj) {
                // Check if already equipped
                if (buildState.equippedPassives.some(p => p.id === passiveObj.id)) {
                    alert("Kỹ năng bị động này đã được trang bị cho Pal rồi!");
                    return;
                }
                buildState.equippedPassives.push(passiveObj);
                updateBuildUI();
            }
        });
    }

    // Controls listeners
    if (levelSlider) {
        levelSlider.addEventListener("input", (e) => {
            buildState.level = parseInt(e.target.value) || 80;
            document.getElementById("build-level-val").textContent = buildState.level;
            updateBuildUI();
        });
    }
    if (rankSelect) {
        rankSelect.addEventListener("change", (e) => {
            buildState.rank = parseFloat(e.target.value) || 0;
            updateBuildUI();
        });
    }
    if (ivSlider) {
        ivSlider.addEventListener("input", (e) => {
            buildState.iv = parseInt(e.target.value) || 0;
            document.getElementById("build-iv-val").textContent = `${buildState.iv}% (IV ${Math.round((buildState.iv/30)*100)})`;
            updateBuildUI();
        });
    }
    
    // Soul Sliders listeners
    if (soulHpSlider) {
        soulHpSlider.addEventListener("input", (e) => {
            buildState.soulHp = parseInt(e.target.value) || 0;
            const displayEl = document.getElementById("build-soul-hp-val");
            if (displayEl) displayEl.textContent = `+${buildState.soulHp * 3}% (Lv.${buildState.soulHp})`;
            updateBuildUI();
        });
    }
    if (soulAtkSlider) {
        soulAtkSlider.addEventListener("input", (e) => {
            buildState.soulAtk = parseInt(e.target.value) || 0;
            const displayEl = document.getElementById("build-soul-atk-val");
            if (displayEl) displayEl.textContent = `+${buildState.soulAtk * 3}% (Lv.${buildState.soulAtk})`;
            updateBuildUI();
        });
    }
    if (soulDefSlider) {
        soulDefSlider.addEventListener("input", (e) => {
            buildState.soulDef = parseInt(e.target.value) || 0;
            const displayEl = document.getElementById("build-soul-def-val");
            if (displayEl) displayEl.textContent = `+${buildState.soulDef * 3}% (Lv.${buildState.soulDef})`;
            updateBuildUI();
        });
    }
    if (soulWorkSlider) {
        soulWorkSlider.addEventListener("input", (e) => {
            buildState.soulWork = parseInt(e.target.value) || 0;
            const displayEl = document.getElementById("build-soul-work-val");
            if (displayEl) displayEl.textContent = `+${buildState.soulWork * 6}% (Lv.${buildState.soulWork})`;
            updateBuildUI();
        });
    }
    if (btnResetSouls) {
        btnResetSouls.addEventListener("click", () => {
            buildState.soulHp = 0;
            buildState.soulAtk = 0;
            buildState.soulDef = 0;
            buildState.soulWork = 0;
            if (soulHpSlider) soulHpSlider.value = 0;
            if (soulAtkSlider) soulAtkSlider.value = 0;
            if (soulDefSlider) soulDefSlider.value = 0;
            if (soulWorkSlider) soulWorkSlider.value = 0;
            if (document.getElementById("build-soul-hp-val")) document.getElementById("build-soul-hp-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-atk-val")) document.getElementById("build-soul-atk-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-def-val")) document.getElementById("build-soul-def-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-work-val")) document.getElementById("build-soul-work-val").textContent = "+0% (Lv.0)";
            updateBuildUI();
        });
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            buildState.level = 80;
            buildState.rank = 0.20;
            buildState.iv = 15;
            buildState.soulHp = 0;
            buildState.soulAtk = 0;
            buildState.soulDef = 0;
            buildState.soulWork = 0;
            buildState.equippedPassives = [];
            if (levelSlider) levelSlider.value = 80;
            if (document.getElementById("build-level-val")) document.getElementById("build-level-val").textContent = 80;
            if (rankSelect) rankSelect.value = "0.20";
            if (ivSlider) ivSlider.value = 15;
            if (document.getElementById("build-iv-val")) document.getElementById("build-iv-val").textContent = "15% (IV 50)";
            if (soulHpSlider) soulHpSlider.value = 0;
            if (soulAtkSlider) soulAtkSlider.value = 0;
            if (soulDefSlider) soulDefSlider.value = 0;
            if (soulWorkSlider) soulWorkSlider.value = 0;
            if (document.getElementById("build-soul-hp-val")) document.getElementById("build-soul-hp-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-atk-val")) document.getElementById("build-soul-atk-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-def-val")) document.getElementById("build-soul-def-val").textContent = "+0% (Lv.0)";
            if (document.getElementById("build-soul-work-val")) document.getElementById("build-soul-work-val").textContent = "+0% (Lv.0)";
            updateBuildUI();
        });
    }

    if (btnSave) {
        btnSave.addEventListener("click", saveCurrentBuild);
    }
    if (btnClearSaved) {
        btnClearSaved.addEventListener("click", () => {
            if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách Build Pal đã lưu không?")) {
                localStorage.removeItem("saved_pal_builds");
                renderSavedBuilds();
            }
        });
    }

    renderSavedBuilds();
}

function removeEquippedPassive(index) {
    buildState.equippedPassives.splice(index, 1);
    updateBuildUI();
}

function updateBuildUI() {
    const pal = allPals.find(p => p.id === buildState.selectedPalId) || allPals[0];
    if (!pal) return;

    // Update slots count
    const countEl = document.getElementById("build-passives-count");
    if (countEl) countEl.textContent = `${buildState.equippedPassives.length} / 4 Slot`;

    // Render slots
    const slotsContainer = document.getElementById("equipped-passives-list");
    if (slotsContainer) {
        let slotsHTML = "";
        for (let i = 0; i < 4; i++) {
            const item = buildState.equippedPassives[i];
            if (item) {
                const mod = extractPassiveModifiers(item);
                const modTags = [
                    mod.atk ? `<span style="color:#fb923c;">ATK ${mod.atk > 0 ? '+' : ''}${mod.atk}%</span>` : '',
                    mod.def ? `<span style="color:#38bdf8;">DEF ${mod.def > 0 ? '+' : ''}${mod.def}%</span>` : '',
                    mod.hp ? `<span style="color:#f87171;">HP ${mod.hp > 0 ? '+' : ''}${mod.hp}%</span>` : '',
                    mod.work ? `<span style="color:#60a5fa;">Work ${mod.work > 0 ? '+' : ''}${mod.work}%</span>` : '',
                    mod.speed ? `<span style="color:#facc15;">Speed ${mod.speed > 0 ? '+' : ''}${mod.speed}%</span>` : ''
                ].filter(Boolean).join(" | ");

                slotsHTML += `
                    <div class="equipped-slot-card">
                        <div class="equipped-slot-info">
                            <div class="equipped-slot-name">
                                <span class="badge" style="background:#334155; color:#facc15; font-size:0.75rem;">Slot ${i+1}</span>
                                <span>${item.name}</span>
                            </div>
                            <div class="equipped-slot-desc">${item.desc_vi || item.desc || ''}</div>
                            ${modTags ? `<div style="font-size:0.78rem; font-weight:700; margin-top:4px;">Hệ số: ${modTags}</div>` : ''}
                        </div>
                        <button class="remove-slot-btn" onclick="removeEquippedPassive(${i})" title="Tháo kỹ năng này">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `;
            } else {
                slotsHTML += `
                    <div class="equipped-slot-card empty-slot">
                        <span><i class="fa-solid fa-circle-plus"></i> Slot ${i+1} trống (Chọn kỹ năng từ ô tìm kiếm trên để lắp vào)</span>
                    </div>
                `;
            }
        }
        slotsContainer.innerHTML = slotsHTML;
    }

    // Calculate total passive stat bonuses
    let totalPassiveAtk = 0, totalPassiveDef = 0, totalPassiveHp = 0, totalPassiveWork = 0, totalPassiveSpeed = 0;
    buildState.equippedPassives.forEach(item => {
        const mod = extractPassiveModifiers(item);
        totalPassiveAtk += mod.atk;
        totalPassiveDef += mod.def;
        totalPassiveHp += mod.hp;
        totalPassiveWork += mod.work;
        totalPassiveSpeed += mod.speed;
    });

    const stats = pal.stats || {};
    const baseHp = stats.hp || 100;
    const baseAtk = stats.attack || 100;
    const baseDef = stats.defense || 100;
    
    const lv = buildState.level;
    const ivRatio = buildState.iv / 100;
    const rankBonus = buildState.rank;
    const soulHpBonus = buildState.soulHp * 0.03;
    const soulAtkBonus = buildState.soulAtk * 0.03;
    const soulDefBonus = buildState.soulDef * 0.03;
    const soulWorkBonus = buildState.soulWork * 0.06;
    
    const passiveHpRatio = totalPassiveHp / 100;
    const passiveAtkRatio = totalPassiveAtk / 100;
    const passiveDefRatio = totalPassiveDef / 100;

    // Canonical Formulas with individual Soul bonuses:
    const finalHp = Math.floor((500 + 5 * lv + baseHp * 0.5 * lv * (1 + ivRatio)) * (1 + rankBonus) * (1 + soulHpBonus) * (1 + passiveHpRatio));
    const finalAtk = Math.floor((100 + baseAtk * 0.075 * lv * (1 + ivRatio)) * (1 + rankBonus) * (1 + soulAtkBonus) * (1 + passiveAtkRatio));
    const finalDef = Math.floor((50 + baseDef * 0.075 * lv * (1 + ivRatio)) * (1 + rankBonus) * (1 + soulDefBonus) * (1 + passiveDefRatio));

    // Base level 1 comparison
    const base1Hp = Math.floor(500 + 5 + baseHp * 0.5);
    const base1Atk = Math.floor(100 + baseAtk * 0.075);
    const base1Def = Math.floor(50 + baseDef * 0.075);

    // Min-Max IV range at this level & setup
    const minHp = Math.floor((500 + 5 * lv + baseHp * 0.5 * lv * 1.0) * (1 + rankBonus) * (1 + soulHpBonus) * (1 + passiveHpRatio));
    const maxHp = Math.floor((500 + 5 * lv + baseHp * 0.5 * lv * 1.30) * (1 + rankBonus) * (1 + soulHpBonus) * (1 + passiveHpRatio));
    const minAtk = Math.floor((100 + baseAtk * 0.075 * lv * 1.0) * (1 + rankBonus) * (1 + soulAtkBonus) * (1 + passiveAtkRatio));
    const maxAtk = Math.floor((100 + baseAtk * 0.075 * lv * 1.30) * (1 + rankBonus) * (1 + soulAtkBonus) * (1 + passiveAtkRatio));
    const minDef = Math.floor((50 + baseDef * 0.075 * lv * 1.0) * (1 + rankBonus) * (1 + soulDefBonus) * (1 + passiveDefRatio));
    const maxDef = Math.floor((50 + baseDef * 0.075 * lv * 1.30) * (1 + rankBonus) * (1 + soulDefBonus) * (1 + passiveDefRatio));

    const baseWork = stats.support || 100;
    const workSpeedFinalNum = Math.round(baseWork * (1 + totalPassiveWork / 100) * (1 + soulWorkBonus));
    const mount = pal.mount || {};
    const baseSprint = stats.sprint_speed || (mount.sprint_speed > 0 ? mount.sprint_speed : 600);
    const sprintSpeedFinal = Math.round(baseSprint * (1 + totalPassiveSpeed / 100));

    // Elements badges
    let elemsHTML = "";
    if (pal.elements && pal.elements.length > 0) {
        elemsHTML = pal.elements.map(el => {
            const elLower = el.toLowerCase();
            return `<span class="element-badge elem-${elLower}" style="padding:4px 10px; font-size:0.8rem;">${el}</span>`;
        }).join(" ");
    } else {
        elemsHTML = `<span class="element-badge elem-normal" style="padding:4px 10px; font-size:0.8rem;">Normal</span>`;
    }

    const summaryCard = document.getElementById("build-summary-card");
    if (summaryCard) {
        summaryCard.innerHTML = `
            <div style="display:flex; align-items:center; gap:16px; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:16px; margin-bottom:18px;">
                <img src="${pal.image_url || 'https://via.placeholder.com/80'}" alt="${pal.name}" style="width:76px; height:76px; border-radius:50%; object-fit:cover; border:2px solid #38bdf8; box-shadow:0 0 15px rgba(56,189,248,0.4);" onerror="this.src='https://via.placeholder.com/80?text=Pal'">
                <div>
                    <div style="font-size:0.8rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">#ID ${pal.id || '?'} | Phẩm chất Rank ${stats.rarity || 1}</div>
                    <h2 style="font-size:1.6rem; color:#fff; font-weight:800; margin:4px 0;">${pal.name}</h2>
                    <div style="display:flex; gap:6px; margin-top:4px;">${elemsHTML}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:18px;">
                <div class="build-stat-box border-t-4 border-t-red-400">
                    <span class="s-label">❤️ SINH LỰC (HP)</span>
                    <span class="s-val" style="color:#f87171;">${finalHp.toLocaleString('vi-VN')}</span>
                    <span class="s-diff" style="color:#94a3b8;">Min-Max IV: ${minHp.toLocaleString('vi-VN')} - ${maxHp.toLocaleString('vi-VN')}</span>
                </div>
                <div class="build-stat-box border-t-4 border-t-orange-400">
                    <span class="s-label">🏹 TẤN CÔNG (ATK)</span>
                    <span class="s-val" style="color:#fb923c;">${finalAtk.toLocaleString('vi-VN')}</span>
                    <span class="s-diff" style="color:#94a3b8;">Min-Max IV: ${minAtk.toLocaleString('vi-VN')} - ${maxAtk.toLocaleString('vi-VN')}</span>
                </div>
                <div class="build-stat-box border-t-4 border-t-sky-400">
                    <span class="s-label">🛡️ PHÒNG THỦ (DEF)</span>
                    <span class="s-val" style="color:#38bdf8;">${finalDef.toLocaleString('vi-VN')}</span>
                    <span class="s-diff" style="color:#94a3b8;">Min-Max IV: ${minDef.toLocaleString('vi-VN')} - ${maxDef.toLocaleString('vi-VN')}</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:18px; background:rgba(30,41,59,0.5); padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                <div>
                    <span style="font-size:0.8rem; color:#94a3b8; display:block;">🛠️ Tốc độ làm việc tại căn cứ:</span>
                    <strong style="font-size:1.15rem; color:#60a5fa;">${workSpeedFinalNum}</strong> 
                    <span style="font-size:0.78rem; color:#cbd5e1;">(Gốc ${baseWork} | Skill ${totalPassiveWork >= 0 ? '+' : ''}${totalPassiveWork}% | Soul ${soulWorkBonus >= 0 ? '+' : ''}${Math.round(soulWorkBonus*100)}%)</span>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:#94a3b8; display:block;">🚀 Tốc độ lướt di chuyển nhanh:</span>
                    <strong style="font-size:1.15rem; color:#facc15;">${sprintSpeedFinal}</strong> 
                    <span style="font-size:0.78rem; color:#cbd5e1;">(Gốc ${baseSprint} ${totalPassiveSpeed >= 0 ? '+' : ''}${totalPassiveSpeed}%)</span>
                </div>
            </div>

            <div style="background:rgba(15,23,42,0.65); border-left:3px solid #facc15; padding:12px 14px; border-radius:8px; font-size:0.84rem; color:#cbd5e1; line-height:1.5;">
                <strong style="color:#facc15;"><i class="fa-solid fa-sliders"></i> Tóm tắt Hệ số nhân (Multipliers Breakdown):</strong><br>
                • Cấp độ: <strong>Lv.${lv}</strong> | Ngưng tụ sao: <strong>+${Math.round(rankBonus*100)}%</strong> (Rank ⭐ ${rankBonus*20})<br>
                • Tiềm năng IVs: <strong>+${buildState.iv}%</strong> | Linh Hồn Statue: <strong>HP +${Math.round(soulHpBonus*100)}% | ATK +${Math.round(soulAtkBonus*100)}% | DEF +${Math.round(soulDefBonus*100)}% | Work +${Math.round(soulWorkBonus*100)}%</strong><br>
                • Tổng Buff từ ${buildState.equippedPassives.length} Skill bị động: <strong>ATK ${totalPassiveAtk >= 0 ? '+' : ''}${totalPassiveAtk}% | DEF ${totalPassiveDef >= 0 ? '+' : ''}${totalPassiveDef}% | HP ${totalPassiveHp >= 0 ? '+' : ''}${totalPassiveHp}%</strong>
            </div>
        `;
    }
}

function saveCurrentBuild() {
    const pal = allPals.find(p => p.id === buildState.selectedPalId) || allPals[0];
    if (!pal) return;

    const buildName = prompt("Nhập tên cho Build Pal này (VD: Solenne Dame Khủng, Anubis Chuyên Chạy...):", `${pal.name} Lv.${buildState.level} Build`);
    if (!buildName) return;

    const savedList = JSON.parse(localStorage.getItem("saved_pal_builds") || "[]");
    const newBuild = {
        id: "build_" + Date.now(),
        name: buildName,
        palId: pal.id,
        palName: pal.name,
        palImg: pal.image_url,
        level: buildState.level,
        rank: buildState.rank,
        iv: buildState.iv,
        soulHp: buildState.soulHp,
        soulAtk: buildState.soulAtk,
        soulDef: buildState.soulDef,
        soulWork: buildState.soulWork,
        passives: buildState.equippedPassives.map(p => ({ id: p.id, name: p.name, desc: p.desc_vi || p.desc }))
    };

    savedList.unshift(newBuild);
    localStorage.setItem("saved_pal_builds", JSON.stringify(savedList));
    renderSavedBuilds();
    alert(`Đã lưu Build "${buildName}" thành công!`);
}

function renderSavedBuilds() {
    const container = document.getElementById("saved-builds-list");
    const countEl = document.getElementById("saved-builds-count");
    const savedList = JSON.parse(localStorage.getItem("saved_pal_builds") || "[]");

    if (countEl) countEl.textContent = savedList.length;
    if (!container) return;

    if (savedList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:25px; color:#64748b; font-style:italic;">
                <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.5;"></i>
                Chưa có Build nào được lưu. Hãy chỉnh thông số và bấm "Lưu Build này"!
            </div>
        `;
        return;
    }

    container.innerHTML = savedList.map(item => {
        const sHp = item.soulHp !== undefined ? item.soulHp : Math.round((item.soul || 0) / 0.03);
        const sAtk = item.soulAtk !== undefined ? item.soulAtk : Math.round((item.soul || 0) / 0.03);
        const sDef = item.soulDef !== undefined ? item.soulDef : Math.round((item.soul || 0) / 0.03);
        const sWork = item.soulWork !== undefined ? item.soulWork : 0;
        return `
            <div class="saved-build-card">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${item.palImg || 'https://via.placeholder.com/48'}" alt="${item.palName}" style="width:46px; height:46px; border-radius:50%; object-fit:cover; border:1px solid #38bdf8;" onerror="this.src='https://via.placeholder.com/48?text=Pal'">
                    <div>
                        <strong style="color:#fff; font-size:0.95rem; display:block;">${item.name}</strong>
                        <span style="font-size:0.78rem; color:#94a3b8;">${item.palName} (Lv.${item.level} | ⭐${item.rank*20} | Soul ${sHp}/${sAtk}/${sDef}/${sWork} | ${item.passives.length} Skill)</span>
                    </div>
                </div>
                <div class="saved-build-actions">
                    <button class="chip" onclick="loadSavedBuild('${item.id}')" style="padding:6px 12px; font-size:0.78rem; background:rgba(56,189,248,0.2); border-color:#38bdf8; color:#38bdf8; cursor:pointer;" title="Tải Build này">
                        <i class="fa-solid fa-upload"></i> Tải
                    </button>
                    <button class="remove-slot-btn" onclick="deleteSavedBuild('${item.id}')" title="Xóa build này">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function loadSavedBuild(buildId) {
    const savedList = JSON.parse(localStorage.getItem("saved_pal_builds") || "[]");
    const found = savedList.find(b => b.id === buildId);
    if (!found) return;

    buildState.selectedPalId = found.palId;
    buildState.level = found.level;
    buildState.rank = found.rank;
    buildState.iv = found.iv;
    buildState.soulHp = found.soulHp !== undefined ? found.soulHp : Math.round((found.soul || 0) / 0.03);
    buildState.soulAtk = found.soulAtk !== undefined ? found.soulAtk : Math.round((found.soul || 0) / 0.03);
    buildState.soulDef = found.soulDef !== undefined ? found.soulDef : Math.round((found.soul || 0) / 0.03);
    buildState.soulWork = found.soulWork !== undefined ? found.soulWork : 0;
    
    // Map passives from allPassivesData
    buildState.equippedPassives = [];
    if (found.passives && Array.isArray(found.passives)) {
        found.passives.forEach(p => {
            const obj = allPassivesData.find(item => item.id === p.id || item.name === p.name);
            if (obj) buildState.equippedPassives.push(obj);
        });
    }

    // Sync UI inputs
    const palSelect = document.getElementById("build-pal-select");
    if (palSelect) palSelect.value = buildState.selectedPalId;
    const levelSlider = document.getElementById("build-level");
    if (levelSlider) levelSlider.value = buildState.level;
    if (document.getElementById("build-level-val")) document.getElementById("build-level-val").textContent = buildState.level;
    const rankSelect = document.getElementById("build-rank");
    if (rankSelect) rankSelect.value = String(buildState.rank);
    const ivSlider = document.getElementById("build-iv");
    if (ivSlider) ivSlider.value = buildState.iv;
    if (document.getElementById("build-iv-val")) document.getElementById("build-iv-val").textContent = `${buildState.iv}% (IV ${Math.round((buildState.iv/30)*100)})`;
    
    const soulHpSlider = document.getElementById("build-soul-hp");
    if (soulHpSlider) soulHpSlider.value = buildState.soulHp;
    if (document.getElementById("build-soul-hp-val")) document.getElementById("build-soul-hp-val").textContent = `+${buildState.soulHp * 3}% (Lv.${buildState.soulHp})`;

    const soulAtkSlider = document.getElementById("build-soul-atk");
    if (soulAtkSlider) soulAtkSlider.value = buildState.soulAtk;
    if (document.getElementById("build-soul-atk-val")) document.getElementById("build-soul-atk-val").textContent = `+${buildState.soulAtk * 3}% (Lv.${buildState.soulAtk})`;

    const soulDefSlider = document.getElementById("build-soul-def");
    if (soulDefSlider) soulDefSlider.value = buildState.soulDef;
    if (document.getElementById("build-soul-def-val")) document.getElementById("build-soul-def-val").textContent = `+${buildState.soulDef * 3}% (Lv.${buildState.soulDef})`;

    const soulWorkSlider = document.getElementById("build-soul-work");
    if (soulWorkSlider) soulWorkSlider.value = buildState.soulWork;
    if (document.getElementById("build-soul-work-val")) document.getElementById("build-soul-work-val").textContent = `+${buildState.soulWork * 6}% (Lv.${buildState.soulWork})`;

    updateBuildUI();
    alert(`Đã tải cấu hình Build "${found.name}"!`);
}

function deleteSavedBuild(buildId) {
    let savedList = JSON.parse(localStorage.getItem("saved_pal_builds") || "[]");
    savedList = savedList.filter(b => b.id !== buildId);
    localStorage.setItem("saved_pal_builds", JSON.stringify(savedList));
    renderSavedBuilds();
}

