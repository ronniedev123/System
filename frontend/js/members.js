const token = localStorage.getItem("token");

if (!token && window.location.pathname.endsWith('members.html')) {
    window.location.href = 'index.html';
}

const membersTable = document.getElementById("membersTable");
const addMemberForm = document.getElementById("addMemberForm");
let currentEditingMemberId = null;

async function fetchMembers() {
    const res = await fetch("http://localhost:3000/api/members", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    
    const tbody = membersTable.querySelector('tbody');
    tbody.innerHTML = "";
    
    data.forEach(m => {
        const tr = document.createElement("tr");
        const nameLink = `<a href="member-graph.html?id=${m.id}&name=${encodeURIComponent(m.name)}" style="color:#2196F3; text-decoration:none; cursor:pointer; font-weight:bold;">${m.name}</a>`;
        tr.innerHTML = `
            <td>${m.id}</td>
            <td>${nameLink}</td>
            <td>${m.email || ''}</td>
            <td>${m.phone || ''}</td>
            <td>${m.address || ''}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${m.id}, '${m.name.replace(/'/g, "\\'\'")}', '${(m.email || '').replace(/'/g, "\\'\'")}', '${(m.phone || '').replace(/'/g, "\\'\'")}', '${(m.address || '').replace(/'/g, "\\'\'")}')" style="background-color:#2196F3; color:white; padding:8px 12px; margin:0 3px; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">Edit</button>
                <button class="delete-btn" onclick="deleteMember(${m.id})" style="background-color:#f44336; color:white; padding:8px 12px; margin:0 3px; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Open edit modal
window.openEditModal = function(id, name, email, phone, address) {
    currentEditingMemberId = id;
    document.getElementById('edit_name').value = name;
    document.getElementById('edit_email').value = email;
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
        const phone = document.getElementById('edit_phone').value;
        const address = document.getElementById('edit_address').value;
        
        try {
            const res = await fetch(`http://localhost:3000/api/members/${currentEditingMemberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, phone, address })
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
        const res = await fetch(`http://localhost:3000/api/members/${id}`, {
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
        const phone = document.getElementById("phone").value;
        const address = document.getElementById("address").value;
        
        try {
            const res = await fetch("http://localhost:3000/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name, email, phone, address })
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
