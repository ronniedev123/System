(async()=>{
  const f = global.fetch || (await import('node-fetch')).default;
  const loginRes = await f('http://localhost:3000/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'admin@church.com', password:'admin123'})});
  const login = await loginRes.json();
  const token = login.token;
  console.log('token length', token.length);
  const createRes = await f('http://localhost:3000/api/members', {method:'POST', headers:{'Content-Type':'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify({name:'API Test Member2', email:'apitest2@example.com', phone:'070000002', address:'Addr2'})});
  console.log('create status', createRes.status);
  const createText = await createRes.text(); console.log('create body', createText);
  const listRes = await f('http://localhost:3000/api/members', {headers: {'Authorization': `Bearer ${token}`}});
  console.log('list status', listRes.status);
  const listText = await listRes.text(); console.log('list body', listText);
})();