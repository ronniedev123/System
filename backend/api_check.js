(async()=>{
  const base = 'http://localhost:3000/api';
  const fetch = global.fetch || (await import('node-fetch')).default;
  const out = [];
  try{
    // Login
    const login = await fetch(base + '/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@church.com',password:'admin123'})});
    out.push({name:'auth/login', ok: login.ok, status: login.status, body: await safeText(login)});
    if(!login.ok){ console.log(JSON.stringify(out,null,2)); process.exit(1); }
    const j = await login.json();
    const token = j.token;

    // members list
    const members = await fetch(base + '/members',{headers:{Authorization:`Bearer ${token}`}});
    out.push({name:'members/list', ok: members.ok, status: members.status, body: await safeJson(members)});

    // create member
    const createMember = await fetch(base + '/members',{method:'POST',headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},body:JSON.stringify({name:'Test Member',email:'testmember@example.com',phone:'12345',address:'nowhere'})});
    out.push({name:'members/create', ok: createMember.ok, status: createMember.status, body: await safeJson(createMember)});
    let memberId=null;
    try{ const cm=await createMember.json(); memberId = cm.insertId || cm.id || null; }catch(e){}

    // mark attendance
    const mark = await fetch(base + '/attendance/mark',{method:'POST',headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},body:JSON.stringify({memberId: memberId || 1})});
    out.push({name:'attendance/mark', ok: mark.ok, status: mark.status, body: await safeJson(mark)});

    // monthly report
    const now = new Date(); const year=now.getFullYear(); const month=now.getMonth()+1;
    const report = await fetch(base + `/attendance/report/month?year=${year}&month=${month}`,{headers:{Authorization:`Bearer ${token}`}});
    out.push({name:'attendance/report/month', ok: report.ok, status: report.status, body: await safeJson(report)});

    // donations list
    const donations = await fetch(base + '/donations',{headers:{Authorization:`Bearer ${token}`}});
    out.push({name:'donations/list', ok: donations.ok, status: donations.status, body: await safeJson(donations)});

    // create donation (use memberId or 1)
    const createDon = await fetch(base + '/donations',{method:'POST',headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},body:JSON.stringify({memberId: memberId || 1, amount:50, description:'Test donation'})});
    out.push({name:'donations/create', ok: createDon.ok, status: createDon.status, body: await safeJson(createDon)});

    // events list
    const events = await fetch(base + '/events',{headers:{Authorization:`Bearer ${token}`}});
    out.push({name:'events/list', ok: events.ok, status: events.status, body: await safeJson(events)});

    // create event
    const createEvent = await fetch(base + '/events',{method:'POST',headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},body:JSON.stringify({title:'Test Event', description:'desc', date: (new Date()).toISOString()})});
    out.push({name:'events/create', ok: createEvent.ok, status: createEvent.status, body: await safeJson(createEvent)});

    // announcements list
    const ann = await fetch(base + '/announcements',{headers:{Authorization:`Bearer ${token}`}});
    out.push({name:'announcements/list', ok: ann.ok, status: ann.status, body: await safeJson(ann)});

    // create announcement
    const createAnn = await fetch(base + '/announcements',{method:'POST',headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},body:JSON.stringify({title:'API Test', message:'Automated test', sendEmailToMembers:false})});
    out.push({name:'announcements/create', ok: createAnn.ok, status: createAnn.status, body: await safeJson(createAnn)});

    console.log(JSON.stringify(out,null,2));
  }catch(e){ console.error('ERROR', e.message); }

  function tryJson(res){ try{ return res.json(); }catch(e){ return res.text(); }}
  async function safeJson(res){ try{ const t = await res.text(); try{ return JSON.parse(t); }catch(e){ return t; } }catch(e){ return String(e.message);} }
  async function safeText(res){ try{ return await res.text(); }catch(e){ return String(e.message);} }
})();
