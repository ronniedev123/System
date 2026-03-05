const token = localStorage.getItem("token");
const donationsTable = document.getElementById("donationsTable");
const donationForm = document.getElementById("donationForm");
const totalContributedEl = document.getElementById("totalContributed");
const showDonateBtn = document.getElementById("showDonateBtn");
const cancelDonateBtn = document.getElementById("cancelDonateBtn");
const donateFormDiv = document.getElementById("donateFormDiv");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (!token) window.location.href = "index.html";

const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
const role = payload ? payload.role : null;

const params = new URLSearchParams(window.location.search);
const contributionType = params.get("type");

const TYPE_META = {
    "missions": {
        title: "Missions Contributions",
        bank: "Kingdom Missions Bank",
        accountName: "Ministry of Repentance and Holiness - Missions",
        accountNumber: "1002003001",
        paybill: "821001",
        reference: "MISSIONS"
    },
    "tithes-offerings": {
        title: "Tithes and Offerings Contributions",
        bank: "Diamond Trust Bank",
        accountName: "Ministry of Repentance and Holiness",
        accountNumber: "0055227001",
        paybill: "516600",
        reference: "TITHE"
    },
    "tabernacle-construction": {
        title: "Tabernacle Construction Contributions",
        bank: "Builders Trust Bank",
        accountName: "Ministry of Repentance and Holiness - Tabernacle Construction",
        accountNumber: "1002003003",
        paybill: "821003",
        reference: "TABERNACLE"
    }
};

if (!TYPE_META[contributionType]) {
    alert("Invalid contribution type selected");
    window.location.href = "donations.html";
}

function setupTypeDetails() {
    const meta = TYPE_META[contributionType];
    document.getElementById("contribTitle").textContent = meta.title;
    document.getElementById("accBank").textContent = meta.bank;
    document.getElementById("accName").textContent = meta.accountName;
    document.getElementById("accNumber").textContent = meta.accountNumber;
    document.getElementById("accPaybill").textContent = meta.paybill;
    document.getElementById("accRef").textContent = meta.reference;
}

async function fetchContributions() {
    const res = await fetch(`/api/donations?type=${encodeURIComponent(contributionType)}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    let total = 0;
    donationsTable.innerHTML = "";

    data.forEach((d) => {
        const amountNum = Number(d.amount) || 0;
        total += amountNum;
        const tr = document.createElement("tr");
        const actions = (role === 'admin') ?
            `<button onclick="editContribution(${d.id})">Edit</button> <button onclick="deleteContribution(${d.id})">Delete</button>` :
            '<span style="opacity:.7;">-</span>';
        tr.innerHTML = `<td>${d.id}</td><td>${d.user_name || d.donor_name || ''}</td><td>KSH ${amountNum.toLocaleString()}</td><td>${d.description || ''}</td><td>${d.date || ''}</td><td>${actions}</td>`;
        donationsTable.appendChild(tr);
    });

    totalContributedEl.textContent = `KSH ${total.toLocaleString()}`;
}

window.deleteContribution = async function(id) {
    if(!confirm('Delete this contribution?')) return;
    try {
        const res = await fetch(`/api/donations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if(res.ok) fetchContributions();
        else { const data = await res.json(); alert(data.error || 'Delete failed'); }
    } catch (err) { console.error(err); alert('Server error'); }
};

window.editContribution = async function(id) {
    try {
        const getRes = await fetch(`/api/donations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if(!getRes.ok){ const d = await getRes.json(); alert(d.error || 'Not found'); return; }
        const row = await getRes.json();
        const newAmount = prompt('Amount', row.amount);
        if (newAmount === null) return;
        const newDescription = prompt('Description', row.description || '');
        if (newDescription === null) return;
        const newDate = prompt('Date (YYYY-MM-DD)', row.date ? row.date.split('T')[0] : '');
        if (newDate === null) return;

        const res = await fetch(`/api/donations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: newAmount, date: newDate, description: newDescription, contributionType })
        });
        if(res.ok) fetchContributions();
        else { const data = await res.json(); alert(data.error || 'Update failed'); }
    } catch (err) { console.error(err); alert('Server error'); }
};

if (donationForm) {
    donationForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const memberName = document.getElementById("member_name")?.value || null;
        const amount = document.getElementById("amount").value;
        const description = document.getElementById("description")?.value || null;
        if(!memberName){ alert('Please enter a member name'); return; }

        try {
            const res = await fetch("/api/donations/add", {
                method: "POST",
                headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ memberName, amount, description, contributionType })
            });
            if(res.ok){
                alert('Contribution added successfully');
                donationForm.reset();
                donateFormDiv.classList.add('hidden');
                fetchContributions();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to add contribution');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        }
    });
}

showDonateBtn?.addEventListener('click', () => {
    donateFormDiv?.classList.remove('hidden');
    document.getElementById("member_name")?.focus();
});

cancelDonateBtn?.addEventListener('click', () => {
    donateFormDiv?.classList.add('hidden');
});

refreshBtn?.addEventListener('click', fetchContributions);

logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

setupTypeDetails();
fetchContributions();
