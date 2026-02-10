const db = require("../utils/db");

exports.addAttendance = async ({ memberId, date, createdBy }) => {
  // 'date' param maps to check_in column in DB
  let checkInStr;
  
  if (!date) {
    // Default to today at 9:00 AM
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    checkInStr = `${yyyy}-${mm}-${dd} 09:00:00`;
  } else if (typeof date === 'string') {
    // If it's already a formatted string like '2026-02-05 09:00:00', use it directly
    if (date.includes('-') && date.includes(':')) {
      checkInStr = date;
    } else {
      // If it's an ISO string, extract just the date part and add 09:00:00
      const datePart = date.split('T')[0];
      checkInStr = `${datePart} 09:00:00`;
    }
  } else {
    // For Date objects, format to local date at 9:00 AM
    const checkIn = new Date(date);
    const yyyy = checkIn.getFullYear();
    const mm = String(checkIn.getMonth() + 1).padStart(2, '0');
    const dd = String(checkIn.getDate()).padStart(2, '0');
    checkInStr = `${yyyy}-${mm}-${dd} 09:00:00`;
  }
  
  const [result] = await db.execute(
    "INSERT INTO attendance (member_id, check_in, created_by) VALUES (?, ?, ?)",
    [memberId, checkInStr, createdBy]
  );
  return { insertId: result.insertId, memberId, check_in: checkInStr };
};

exports.getByMember = async (memberId) => {
  const [rows] = await db.execute("SELECT * FROM attendance WHERE member_id = ?", [memberId]);
  return rows;
};

exports.getAllRecords = async (user) => {
  // Return joined attendance with member/user name - all users can see all records
  const [rows] = await db.execute(
    `SELECT a.id, a.member_id, a.check_in, m.name as user_name
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     ORDER BY a.check_in DESC LIMIT 200`
  );
  return rows;
};

// Count attendance per member between dates (inclusive)
exports.getCountsByMemberBetween = async (startDate, endDate) => {
  const [rows] = await db.execute(
    `SELECT a.member_id, m.name as member_name, COUNT(*) as count
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     WHERE a.check_in BETWEEN ? AND ?
     GROUP BY a.member_id, m.name
     ORDER BY count DESC`,
    [startDate, endDate]
  );
  return rows;
};

// Count attendance for a specific member between dates
exports.getCountForMemberBetween = async (memberId, startDate, endDate) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) as count FROM attendance WHERE member_id = ? AND check_in BETWEEN ? AND ?`,
    [memberId, startDate, endDate]
  );
  return rows[0].count || 0;
};

exports.getTrends = async (user) => {
  // Trend data - all users can see all trends
  const [rows] = await db.execute(
    "SELECT DATE(check_in) as date, COUNT(*) as count FROM attendance GROUP BY DATE(check_in) ORDER BY DATE(check_in) DESC LIMIT 30"
  );
  return rows;
};

// Delete attendance record by member ID and date
exports.deleteByMemberAndDate = async (memberId, date) => {
  // Extract date part if full datetime is provided
  let datePart = date;
  if (date.includes(' ')) {
    datePart = date.split(' ')[0];
  } else if (date.includes('T')) {
    datePart = date.split('T')[0];
  }
  
  // Delete any attendance records for this member on this date
  const [result] = await db.execute(
    "DELETE FROM attendance WHERE member_id = ? AND DATE(check_in) = ?",
    [memberId, datePart]
  );
  return result;
};
