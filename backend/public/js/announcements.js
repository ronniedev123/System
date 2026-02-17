const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
const role = payload.role;

async function loadAnnouncements(){
  const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${token}`}});
  if(!res.ok) return console.error('Failed to load announcements', await res.text());
  const list = await res.json();
  const ul = document.getElementById('list');
  ul.innerHTML = '';
  list.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${a.title}</strong> — ${a.message} <small>by ${a.created_by_name || 'Unknown'} on ${new Date(a.created_at).toLocaleString()}</small>`;
    ul.appendChild(li);
  });
}

// Load members for SMS (admin only)
async function loadMembers() {
  if (role !== 'admin') return;
  
  try {
    const res = await fetch('/api/members', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load members');
    
    const members = await res.json();
    const select = document.getElementById('memberSelect');
    select.innerHTML = '<option value="">-- Select a member --</option>';
    
    members
      .filter(m => m.phone && m.phone.trim() !== '')
      .forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = `${m.name} (${m.phone})`;
        select.appendChild(option);
      });
  } catch (err) {
    console.error('Failed to load members', err);
  }
}

// Show SMS section for admins
if (role === 'admin') {
  document.getElementById('adminSMSSection').style.display = 'block';
  loadMembers();
}

// Character counter for SMS
document.getElementById('smsMessage').addEventListener('input', function() {
  const count = this.value.length;
  const charCountDiv = document.getElementById('smsCharCount');
  charCountDiv.textContent = `Characters: ${count} / 160`;
  if (count > 160) {
    charCountDiv.style.color = '#f44336';
  } else {
    charCountDiv.style.color = '#666';
  }
});

// Send SMS button
document.getElementById('sendSMSBtn').addEventListener('click', async () => {
  const memberId = document.getElementById('memberSelect').value;
  const message = document.getElementById('smsMessage').value.trim();
  const statusDiv = document.getElementById('smsStatus');
  
  if (!memberId) {
    statusDiv.innerHTML = '<div class="error">Please select a member</div>';
    return;
  }
  
  if (!message) {
    statusDiv.innerHTML = '<div class="error">Please enter a message</div>';
    return;
  }
  
  if (message.length > 160) {
    statusDiv.innerHTML = '<div class="error">Message exceeds 160 characters</div>';
    return;
  }
  
  try {
    statusDiv.innerHTML = '<div style="color: #2196F3;">Sending...</div>';
    
    const res = await fetch('/api/announcements/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ memberId: parseInt(memberId), message })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      statusDiv.innerHTML = `<div class="success">✓ ${data.message}</div>`;
      document.getElementById('smsMessage').value = '';
      document.getElementById('memberSelect').value = '';
      loadAnnouncements();
    } else {
      statusDiv.innerHTML = `<div class="error">✗ ${data.error}</div>`;
    }
  } catch (err) {
    console.error(err);
    statusDiv.innerHTML = '<div class="error">Error sending SMS</div>';
  }
});

document.getElementById('createBtn').addEventListener('click', async ()=>{
  const title = document.getElementById('title').value.trim();
  const message = document.getElementById('message').value.trim();
  const sendEmail = document.getElementById('sendEmail').checked;
  if(!title || !message) return alert('Title and message required');
  const res = await fetch('/api/announcements', {
    method:'POST',
    headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, message, sendEmailToMembers: sendEmail })
  });
  if(!res.ok) return alert('Failed: ' + await res.text());
  document.getElementById('title').value='';
  document.getElementById('message').value='';
  document.getElementById('sendEmail').checked=false;
  loadAnnouncements();
});

loadAnnouncements();
