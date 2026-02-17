const token = localStorage.getItem("token");
const donationsTable = document.getElementById("donationsTable");
const donationForm = document.getElementById("donationForm");

const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
const role = payload ? payload.role : null;

if (!token && window.location.pathname.endsWith('donations.html')) {
    window.location.href = 'index.html';
}

async function fetchDonations(){
    const res = await fetch("https://unbeclouded-pamelia-nonevilly.ngrok-free.dev/api/donations", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    donationsTable.innerHTML = "";
    data.forEach(d=>{
        const tr = document.createElement("tr");
        const actions = (role === 'admin') ?
            `<button onclick="editDonation(${d.id})">Edit</button> <button onclick="deleteDonation(${d.id})">Delete</button>` : '';
        tr.innerHTML = `<td>${d.id}</td><td>${d.user_name || d.donor_name || ''}</td><td>${d.amount}</td><td>${d.description || ''}</td><td>${d.date}</td><td>${actions}</td>`;
        donationsTable.appendChild(tr);
    });
}

// Admin actions
window.deleteDonation = async function(id){
    if(!confirm('Delete this donation?')) return;
    try{
        const res = await fetch(`https://unbeclouded-pamelia-nonevilly.ngrok-free.dev/api/donations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if(res.ok) fetchDonations();
        else { const data = await res.json(); alert(data.error || 'Delete failed'); }
    }catch(err){ console.error(err); alert('Server error'); }
}

window.editDonation = async function(id){
    try{
        const getRes = await fetch(`https://unbeclouded-pamelia-nonevilly.ngrok-free.dev/api/donations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if(!getRes.ok){ const d = await getRes.json(); alert(d.error || 'Not found'); return; }
        const donation = await getRes.json();
        const newAmount = prompt('Amount', donation.amount);
        if (newAmount === null) return; // cancelled
        const newDescription = prompt('Description', donation.description || '');
        if (newDescription === null) return;
        const newDate = prompt('Date (YYYY-MM-DD)', donation.date ? donation.date.split('T')[0] : '');
        if (newDate === null) return;

        const res = await fetch(`https://unbeclouded-pamelia-nonevilly.ngrok-free.dev/api/donations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: newAmount, date: newDate, description: newDescription })
        });
        if(res.ok) fetchDonations();
        else { const data = await res.json(); alert(data.error || 'Update failed'); }
    }catch(err){ console.error(err); alert('Server error'); }
}

if(donationForm){
    donationForm.addEventListener("submit", async e=>{
        e.preventDefault();
        const memberName = document.getElementById("member_name")?.value || null;
        const amount = document.getElementById("amount").value;
        const date = document.getElementById("date")?.value || null;
        const description = document.getElementById("description")?.value || null;
        
        if(!memberName){ alert('Please enter a member name'); return; }
        
        try{
            const res = await fetch("https://unbeclouded-pamelia-nonevilly.ngrok-free.dev/api/donations/add", {
                method:"POST",
                headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({memberName, amount, date, description})
            });
            
            if(res.ok){
                alert('Donation added successfully');
                donationForm.reset();
                fetchDonations();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to add donation');
            }
        }catch(err){ console.error(err); alert('Server error'); }
    });
}

fetchDonations();
