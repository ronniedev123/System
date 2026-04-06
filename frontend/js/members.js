const token = localStorage.getItem("token");

if (!token && window.location.pathname.endsWith("members.html")) {
    window.location.href = "index.html";
}

const membersTable = document.getElementById("membersTable");
const addMemberForm = document.getElementById("addMemberForm");
const departmentButtons = document.getElementById("departmentButtons");
const departmentList = document.getElementById("departmentList");
const membersHeading = document.getElementById("membersHeading");

let currentEditingMemberId = null;
let allMembers = [];
let activeDepartment = "All Members";

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
];

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeDepartment(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return UNASSIGNED_LABEL;
    return trimmed.toLowerCase() === "worship" ? "Worshippers" : trimmed;
}

function buildDepartmentList() {
    const seen = new Set();
    const ordered = [MASTER_LABEL];

    const addDept = (dept) => {
        const label = String(dept || "").trim();
        if (!label || label === MASTER_LABEL || label === UNASSIGNED_LABEL) return;
        if (!seen.has(label)) {
            seen.add(label);
            ordered.push(label);
        }
    };

    DEFAULT_DEPARTMENTS.forEach(addDept);

    let hasUnassigned = false;
    allMembers.forEach((m) => {
        const dept = normalizeDepartment(m.department);
        if (dept === UNASSIGNED_LABEL) {
            hasUnassigned = true;
        } else {
            addDept(dept);
        }
    });

    if (hasUnassigned) {
        ordered.push(UNASSIGNED_LABEL);
    }

    return ordered;
}

function renderDepartmentButtons() {
    if (!departmentButtons) return;
    const departments = buildDepartmentList();
    if (!departments.includes(activeDepartment)) {
        activeDepartment = MASTER_LABEL;
    }

    departmentButtons.innerHTML = "";
    departments.forEach((dept) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dept-btn${dept === activeDepartment ? " active" : ""}`;
        button.textContent = dept === MASTER_LABEL ? "All Members (Master List)" : dept;
        button.addEventListener("click", () => {
            activeDepartment = dept;
            renderDepartmentButtons();
            renderMembers();
        });
        departmentButtons.appendChild(button);
    });
}

function syncDepartmentDatalist() {
    if (!departmentList) return;
    const departments = buildDepartmentList()
        .filter((dept) => dept !== MASTER_LABEL && dept !== UNASSIGNED_LABEL);
    departmentList.innerHTML = departments
        .map((dept) => `<option value="${escapeHtml(dept)}"></option>`)
        .join("");
}

function renderMembers() {
    if (!membersTable) return;
    const tbody = membersTable.querySelector("tbody");
    if (!tbody) return;

    const filtered = activeDepartment === MASTER_LABEL
        ? allMembers
        : allMembers.filter((m) => normalizeDepartment(m.department) === activeDepartment);

    tbody.innerHTML = "";

    filtered.forEach((m) => {
        const tr = document.createElement("tr");
        const nameLink = `<a href="member-graph.html?id=${m.id}&name=${encodeURIComponent(m.name)}" style="color:#2196F3; text-decoration:none; cursor:pointer; font-weight:bold;">${escapeHtml(m.name)}</a>`;
        const deptLabel = normalizeDepartment(m.department);
        tr.innerHTML = `
            <td>${m.id}</td>
            <td>${nameLink}</td>
            <td>${escapeHtml(m.gender || "")}</td>
            <td>${escapeHtml(deptLabel)}</td>
            <td>${escapeHtml(m.email || "")}</td>
            <td>${escapeHtml(m.phone || "")}</td>
            <td>${escapeHtml(m.address || "")}</td>
            <td class="actions-cell"></td>
        `;

        const actionsCell = tr.querySelector(".actions-cell");
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";
        editBtn.style.cssText =
            "background-color:#2196F3; color:white; padding:8px 12px; margin:0 3px; border:none; border-radius:3px; cursor:pointer; font-weight:bold;";
        editBtn.addEventListener("click", () =>
            openEditModal(
                m.id,
                m.name,
                m.email || "",
                m.phone || "",
                m.address || "",
                m.gender || "",
                m.department || ""
            )
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.style.cssText =
            "background-color:#f44336; color:white; padding:8px 12px; margin:0 3px; border:none; border-radius:3px; cursor:pointer; font-weight:bold;";
        deleteBtn.addEventListener("click", () => deleteMember(m.id));

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        tbody.appendChild(tr);
    });

    if (membersHeading) {
        const label = activeDepartment === MASTER_LABEL
            ? "All Members (Master List)"
            : `${activeDepartment} Members`;
        membersHeading.textContent = `${label} (${filtered.length})`;
    }
}

async function fetchMembers() {
    const res = await fetch("/api/members", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    allMembers = Array.isArray(data) ? data : [];
    allMembers.sort((a, b) => Number(a.id) - Number(b.id));
    renderDepartmentButtons();
    syncDepartmentDatalist();
    renderMembers();
}

// Open edit modal
window.openEditModal = function(id, name, email, phone, address, gender, department) {
    currentEditingMemberId = id;
    document.getElementById('edit_name').value = name;
    document.getElementById('edit_email').value = email;
    document.getElementById('edit_gender').value = gender || "";
    document.getElementById('edit_department').value = department || "";
    document.getElementById('edit_phone').value = phone;
    document.getElementById('edit_address').value = address;
    document.getElementById('editModal').style.display = 'block';
};

// Close edit modal
window.closeEditModal = function() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingMemberId = null;
};

// Handle edit form submission
const editMemberForm = document.getElementById('editMemberForm');
if (editMemberForm) {
    editMemberForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('edit_name').value;
        const email = document.getElementById('edit_email').value;
        const gender = document.getElementById('edit_gender').value;
        const department = document.getElementById('edit_department').value;
        const phone = document.getElementById('edit_phone').value;
        const address = document.getElementById('edit_address').value;

        try {
            const res = await fetch(`/api/members/${currentEditingMemberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, gender, department, phone, address })
            });

            if (res.ok) {
                alert('Member updated successfully');
                closeEditModal();
                fetchMembers();
            } else {
                alert('Failed to update member');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    });
}

// Delete member
window.deleteMember = async function(id) {
    if (!confirm('Are you sure you want to delete this member? All related data (attendance, donations) will also be deleted.')) return;

    try {
        const res = await fetch(`/api/members/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
            alert('Member deleted successfully');
            fetchMembers();
        } else {
            const error = await res.json();
            alert(`Failed to delete member: ${error.message || error.error}`);
        }
    } catch (err) {
        console.error(err);
        alert('Server error: ' + err.message);
    }
};

// Handle add member form
if (addMemberForm) {
    addMemberForm.addEventListener("submit", async e => {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const gender = document.getElementById("gender").value;
        const department = document.getElementById("department").value;
        const phone = document.getElementById("phone").value;
        const address = document.getElementById("address").value;

        try {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name, email, gender, department, phone, address })
            });

            if (res.ok) {
                alert('Member added successfully');
                addMemberForm.reset();
                fetchMembers();
            } else {
                alert('Failed to add member');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    });
}

// Close modal when clicking outside of it
window.addEventListener('click', function(e) {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
        closeEditModal();
    }
});

fetchMembers();
