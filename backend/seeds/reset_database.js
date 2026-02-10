// Reset auto_increment counters for all tables
// Run this once to reset all IDs to 1 (clears all data)
(async () => {
  const db = require('../utils/db');
  try {
    console.log('Resetting database auto_increment values...');
    
    // Truncate all tables (this resets auto_increment to 1 automatically)
    const tables = ['attendance', 'announcements', 'donations', 'events', 'members', 'users'];
    
    for (const table of tables) {
      try {
        await db.execute(`TRUNCATE TABLE ${table}`);
        console.log(`✓ Truncated ${table}`);
      } catch (err) {
        console.log(`⚠ Could not truncate ${table}:`, err.message);
      }
    }
    
    // Re-create admin user
    const hashedPassword = require('bcryptjs').hashSync('admin123', 10);
    await db.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      ['Admin', 'admin@church.com', '0700000000', hashedPassword, 'admin']
    );
    console.log('✓ Admin user created with ID 1');
    
    console.log('\n✅ Database reset successfully! All IDs now start at 1.');
    console.log('Admin email: admin@church.com');
    console.log('Admin password: admin123');
    
  } catch (err) {
    console.error('❌ Reset error:', err.message);
  }
  process.exit();
})();
