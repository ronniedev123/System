const token = localStorage.getItem("token");
let authPayload = null;
let departmentSummary = [];
let totalMembers = 0;

const MASTER_LABEL = "All Members";
const UNASSIGNED_LABEL = "Unassigned";
const DEFAULT_DEPARTMENTS = [
    "Priesthood",
    "Ushers",
    "Translators",
    "Technical Team",
    "Worshippers",
    "Security",
    "Decorators",
    "Kitchen",
    "Sunday School Teachers",
    "Protocal",
    "Evangelism",
];

if (!token) {
    window.location.href = "index.html";
}

try {
    authPayload = JSON.parse(atob(token.split(".")[1]));
} catch (err) {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

if (authPayload?.role === "normaluser") {
    window.location.href = "dashboard.html";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getDepartmentCountByName(department) {
    const match = departmentSummary.find((item) => item.name === department);
    return Number(match?.count || 0);
}

function buildDepartmentList() {
    const seen = new Set();
    const ordered = [MASTER_LABEL];

    const addDepartment = (department) => {
        const label = String(department || "").trim();
        if (!label || label === MASTER_LABEL || label === UNASSIGNED_LABEL) return;
        if (!seen.has(label)) {
            seen.add(label);
            ordered.push(label);
        }
    };

    DEFAULT_DEPARTMENTS.forEach(addDepartment);
    departmentSummary.forEach((item) => addDepartment(item.name));

    if (departmentSummary.some((item) => item.name === UNASSIGNED_LABEL)) {
        ordered.push(UNASSIGNED_LABEL);
    }

    return ordered;
}

function getDepartmentCount(department) {
    if (department === MASTER_LABEL) {
        return totalMembers;
    }

    return getDepartmentCountByName(department);
}

function getDepartmentDescription(department, count) {
    if (department === MASTER_LABEL) {
        return "Open the full master list of every member.";
    }
    if (department === UNASSIGNED_LABEL) {
        return count === 1 ? "1 member still needs a department." : `${count} members still need a department.`;
    }
    return count === 1 ? `Open the ${department} page for 1 member.` : `Open the ${department} page for ${count} members.`;
}

function renderDepartments() {
    const departmentGrid = document.getElementById("departmentGrid");
    if (!departmentGrid) return;

    const departments = buildDepartmentList();
    departmentGrid.innerHTML = departments.map((department) => {
        const count = getDepartmentCount(department);
        const label = department === MASTER_LABEL ? "All Members (Master List)" : department;
        const href = `members.html?department=${encodeURIComponent(department)}`;

        return `
            <a class="department-card" href="${href}">
                <span class="department-count">${count}</span>
                <h4>${escapeHtml(label)}</h4>
                <p class="muted">${escapeHtml(getDepartmentDescription(department, count))}</p>
            </a>
        `;
    }).join("");
}

async function fetchDepartmentSummary() {
    try {
        const res = await fetch("/api/members/departments-summary", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            throw new Error("Failed to load departments");
        }

        const data = await res.json();
        departmentSummary = Array.isArray(data)
            ? data
            : Array.isArray(data?.departments)
                ? data.departments
                : [];
        totalMembers = Number(
            Array.isArray(data)
                ? departmentSummary.reduce((sum, item) => {
                    const name = String(item?.name || "").trim();
                    if (!name || name === UNASSIGNED_LABEL) {
                        return sum;
                    }
                    return sum + Number(item?.count || 0);
                }, 0)
                : data?.totalMembers || 0
        );
        renderDepartments();
    } catch (err) {
        console.error(err);
        const departmentGrid = document.getElementById("departmentGrid");
        if (departmentGrid) {
            departmentGrid.innerHTML = '<div class="loading">Unable to load departments right now.</div>';
        }
    }
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });
}

fetchDepartmentSummary();
