(async ()=>{
  const db = require('../utils/db');
  try{
    // find admin id
    const [admins] = await db.execute("SELECT id FROM users WHERE email = ?", ['admin@church.com']);
    const adminId = admins[0] ? admins[0].id : null;

    const sampleMembers = [
      {name:'Alice Johnson', email:'alice.sample@church.com', phone:'0700000001', address:'Area 1'},
      {name:'Bob Smith', email:'bob.sample@church.com', phone:'0700000002', address:'Area 2'},
      {name:'Carol King', email:'carol.sample@church.com', phone:'0700000003', address:'Area 3'},
      {name:'David Lee', email:'david.sample@church.com', phone:'0700000004', address:'Area 4'},
      {name:'Eve Adams', email:'eve.sample@church.com', phone:'0700000005', address:'Area 5'},
    ];

    // insert members if not exist
    for(const m of sampleMembers){
      const [rows] = await db.execute('SELECT id FROM members WHERE email = ?', [m.email]);
      if(rows.length===0){
        await db.execute('INSERT INTO members (name,email,phone,address,created_by) VALUES (?,?,?,?,?)', [m.name,m.email,m.phone,m.address, adminId]);
        console.log('Inserted member', m.email);
      } else {
        console.log('Member exists', m.email);
      }
    }

    // get member ids
    const [members] = await db.execute("SELECT id FROM members WHERE email LIKE '%sample@church.com%'");
    const memberIds = members.map(r=>r.id);
    if(memberIds.length===0){ console.log('No sample members found, aborting attendance seed'); process.exit(0); }

    // compute last 4 Sundays (including today if Sunday)
    const sundays = [];
    const today = new Date();
    // start from this week's Sunday
    const cur = new Date(today);
    const day = cur.getDay();
    const diffToSunday = (day === 0) ? 0 : (7 - day);
    cur.setDate(cur.getDate() + diffToSunday);
    // go back 3 more weeks
    for(let i=0;i<4;i++){
      const d = new Date(cur);
      d.setDate(cur.getDate() - (7 * i));
      // set time to 09:00:00
      d.setHours(9,0,0,0);
      sundays.push(new Date(d));
    }

    for(const mid of memberIds){
      for(const d of sundays){
        // check duplicate
        const dtStr = d.toISOString().slice(0,19).replace('T',' ');
        const [existing] = await db.execute('SELECT id FROM attendance WHERE member_id = ? AND DATE(check_in) = DATE(?)',[mid, dtStr]);
        if(existing.length===0){
          await db.execute('INSERT INTO attendance (member_id, check_in, created_by) VALUES (?,?,?)', [mid, dtStr, adminId]);
        }
      }
    }

    console.log('Seed completed. Inserted attendance for', memberIds.length, 'members for last', sundays.length, 'Sundays.');
  }catch(e){ console.error('seed error', e.message); }
  process.exit();
})();