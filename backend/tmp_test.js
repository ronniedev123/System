(async()=>{
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email:'admin@church.com', password:'admin123'})
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN:', JSON.stringify(loginJson));
    const token = loginJson.token;
    const rep = await fetch('http://localhost:3000/api/attendance/report/month?year=2026&month=2', {headers:{'Authorization':`Bearer ${token}`}});
    const repJson = await rep.json();
    console.log('REPORT:', JSON.stringify(repJson,null,2));
  } catch(e){ console.error(e); }
})();
