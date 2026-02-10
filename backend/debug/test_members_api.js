(async ()=>{
  try{
    const fetch = global.fetch || (await import('node-fetch')).default;
    const base = 'http://localhost:3000/api';
    const loginRes = await fetch(base + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email:'admin@church.com', password:'admin123' }) });
    const login = await loginRes.json();
    const token = login.token;
    console.log('TOKEN:', token.slice(0,20)+'...');

    // create member
    const now = Date.now();
    const email = `debug${now}@example.com`;
    const createRes = await fetch(base + '/members', { method:'POST', headers: {'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ name:'Debug Member', email, phone:'070000000', address:'Debug Addr' }) });
    console.log('CREATE status', createRes.status); const createText = await createRes.text(); console.log('CREATE body', createText);

    // list members
    const listRes = await fetch(base + '/members', { headers: { Authorization:`Bearer ${token}` } });
    console.log('LIST status', listRes.status); const listText = await listRes.text(); console.log('LIST body', listText.substring(0,200));
    let listJson = null; try{ listJson = JSON.parse(listText); }catch(e){ }

    // find our created member id
    let createdId = null;
    if(listJson && Array.isArray(listJson)){
      const found = listJson.find(m=>m.email===email);
      if(found) createdId = found.id || found.ID || found.id;
    }
    console.log('Found createdId=', createdId);

    if(createdId){
      const delRes = await fetch(base + '/members/' + createdId, { method:'DELETE', headers: { Authorization:`Bearer ${token}` } });
      console.log('DELETE status', delRes.status, 'body', await delRes.text());
    }

    const list2 = await fetch(base + '/members', { headers: { Authorization:`Bearer ${token}` } });
    console.log('LIST2 status', list2.status, 'body', await list2.text().substring(0,200));

  }catch(e){ console.error('ERROR', e.message, e.stack); }
})();
