(async ()=>{
  const db = require('../utils/db');
  try{
    const [members] = await db.execute("SELECT id, name FROM members LIMIT 20");
    if(members.length===0){ console.log('No members found to attach donations/events'); process.exit(0); }
    const adminRow = await db.execute("SELECT id FROM users WHERE email = ?", ['admin@church.com']);
    const adminId = adminRow[0] && adminRow[0][0] ? adminRow[0][0].id : null;

    // Create some events in the next 60 days
    const events = [
      {title:'Sunday Service', description:'Weekly Sunday service', daysFromNow:3},
      {title:'Bible Study', description:'Midweek bible study', daysFromNow:10},
      {title:'Charity Drive', description:'Community support drive', daysFromNow:25},
    ];
    for(const ev of events){
      const d = new Date(); d.setDate(d.getDate() + ev.daysFromNow); const dt = d.toISOString().slice(0,19).replace('T',' ');
      const [existing] = await db.execute('SELECT id FROM events WHERE title = ? AND DATE(event_date)=DATE(?)',[ev.title, dt]);
      if(existing.length===0){
        await db.execute('INSERT INTO events (title, description, event_date, created_by) VALUES (?,?,?,?)',[ev.title, ev.description, dt, adminId]);
        console.log('Inserted event', ev.title);
      } else console.log('Event exists', ev.title);
    }

    // Create sample donations from random members over last 30 days
    const now = Date.now();
    for(let i=0;i<15;i++){
      const member = members[i % members.length];
      const amount = Math.floor(Math.random()*5000) + 100; // 100-5100
      const d = new Date(now - Math.floor(Math.random()*30)*24*3600*1000);
      const dt = d.toISOString().slice(0,19).replace('T',' ');
      await db.execute('INSERT INTO donations (donor_name, amount, donation_date, created_by, description) VALUES (?,?,?,?,?)',[member.name, amount, dt, adminId, 'Seeded donation']);
    }

    console.log('Donations/events seeding complete');
  }catch(e){ console.error('seed error', e.message); }
  process.exit();
})();