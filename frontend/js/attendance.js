const token = localStorage.getItem("token");
const attendanceTable = document.getElementById("attendanceTable");
const attendanceForm = document.getElementById("attendanceForm");

if (!token && window.location.pathname.endsWith('attendance.html')) {
    window.location.href = 'index.html';
}

async function fetchAttendance(){
    const res = await fetch("http://localhost:3000/api/attendance/trends", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    attendanceTable.innerHTML = "";
    data.forEach(a=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${a.date}</td><td>${a.count}</td>`;
        attendanceTable.appendChild(tr);
    });
}

if(attendanceForm){
    attendanceForm.addEventListener("submit", async e=>{
        e.preventDefault();
        const memberId = document.getElementById("member_id")?.value || null;
        let date = document.getElementById("date")?.value || null;
        // convert local datetime to ISO if provided
        if(date) date = new Date(date).toISOString();
        const res = await fetch("http://localhost:3000/api/attendance", {
            method:"POST",
            headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({memberId,date})
        });
        const json = await res.json();
        if(res.ok) alert('Attendance marked'); else alert(json.error||'Error');
        fetchAttendance();
    });
}

// populate member select for attendance
async function populateMemberSelect(){
    try{
        const res = await fetch('http://localhost:3000/api/members',{ headers: { Authorization:`Bearer ${token}`}});
            const members = await res.json();
            const sel = document.getElementById('member_id');
            if(!sel) return;
            sel.innerHTML='';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '-- Select member --';
            placeholder.disabled = true;
            placeholder.selected = true;
            sel.appendChild(placeholder);
            members.forEach(m=>{
                const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.name; sel.appendChild(opt);
            });
    }catch(e){ console.error('populate members', e); }
}

populateMemberSelect();

fetchAttendance();
