const token = localStorage.getItem("token");
const eventsTable = document.getElementById("eventsTable");
const eventForm = document.getElementById("eventForm");

if (!token && window.location.pathname.endsWith('events.html')) {
    window.location.href = 'index.html';
}

async function fetchEvents(){
    const res = await fetch("http://localhost:3000/api/events", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    eventsTable.innerHTML = "";
    data.forEach(e=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${e.title}</td><td>${e.description}</td><td>${e.date}</td>`;
        eventsTable.appendChild(tr);
    });
}

if(eventForm){
    eventForm.addEventListener("submit", async e=>{
        e.preventDefault();
        const title = document.getElementById("title").value;
        const description = document.getElementById("description")?.value || null;
        const date = document.getElementById("date").value;
        await fetch("http://localhost:3000/api/events/add", {
            method:"POST",
            headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({title,description,date})
        });
        fetchEvents();
    });
}

fetchEvents();
