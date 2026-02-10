(async()=>{
  const db = require('./utils/db');
  try{
    const [cols] = await db.execute("SHOW COLUMNS FROM attendance");
    console.log('attendance columns:', cols.map(c=>c.Field));

    const [cols2] = await db.execute("SHOW COLUMNS FROM members");
    console.log('members columns:', cols2.map(c=>c.Field));

    const [cols3] = await db.execute("SHOW COLUMNS FROM donations");
    console.log('donations columns:', cols3.map(c=>c.Field));

    const [cols4] = await db.execute("SHOW COLUMNS FROM events");
    console.log('events columns:', cols4.map(c=>c.Field));
  }catch(e){console.error(e.message);}
  process.exit();
})();