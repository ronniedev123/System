const db = require("../utils/db");

function clampNumber(value, { fallback, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function buildAttendanceFilters({ memberId, memberIds, year, month, department } = {}) {
  const conditions = [];
  const params = [];

  if (memberId) {
    conditions.push("a.member_id = ?");
    params.push(memberId);
  }

  if (Array.isArray(memberIds) && memberIds.length) {
    conditions.push(`a.member_id IN (${memberIds.map(() => "?").join(", ")})`);
    params.push(...memberIds);
  }

  const safeYear = Number.parseInt(year, 10);
  const safeMonth = Number.parseInt(month, 10);
  if (Number.isFinite(safeYear)) {
    if (Number.isFinite(safeMonth) && safeMonth >= 1 && safeMonth <= 12) {
      conditions.push("a.check_in >= ? AND a.check_in < ?");
      params.push(
        `${safeYear}-${String(safeMonth).padStart(2, "0")}-01 00:00:00`,
        safeMonth === 12
          ? `${safeYear + 1}-01-01 00:00:00`
          : `${safeYear}-${String(safeMonth + 1).padStart(2, "0")}-01 00:00:00`
      );
    } else {
      conditions.push("a.check_in >= ? AND a.check_in < ?");
      params.push(`${safeYear}-01-01 00:00:00`, `${safeYear + 1}-01-01 00:00:00`);
    }
  }

  const normalizedDepartment = String(department || "").trim();
  if (normalizedDepartment && normalizedDepartment !== "All Members") {
    if (normalizedDepartment === "Unassigned") {
      conditions.push("(m.department IS NULL OR TRIM(m.department) = '')");
    } else {
      conditions.push("FIND_IN_SET(?, REPLACE(IFNULL(m.department, ''), ', ', ',')) > 0");
      params.push(normalizedDepartment);
    }
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

exports.addAttendance = async ({ memberId, date, createdBy, source = "manual" }) => {
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
    // Try to parse any string into a proper datetime
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      const hh = String(parsed.getHours()).padStart(2, '0');
      const mi = String(parsed.getMinutes()).padStart(2, '0');
      const ss = String(parsed.getSeconds()).padStart(2, '0');
      checkInStr = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    } else if (date.includes('-') && date.includes(':')) {
      // Fallback: replace 'T' with space
      checkInStr = date.replace('T', ' ');
    } else {
      // If it's some other string, default to today at 9am
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      checkInStr = `${yyyy}-${mm}-${dd} 09:00:00`;
    }
  } else {
    // For Date objects, format fully
    const checkIn = new Date(date);
    const yyyy = checkIn.getFullYear();
    const mm = String(checkIn.getMonth() + 1).padStart(2, '0');
    const dd = String(checkIn.getDate()).padStart(2, '0');
    const hh = String(checkIn.getHours()).padStart(2, '0');
    const mi = String(checkIn.getMinutes()).padStart(2, '0');
    const ss = String(checkIn.getSeconds()).padStart(2, '0');
    checkInStr = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }
  
  // Prevent duplicate records for the same member on the same date.
  const dateOnly = checkInStr.split(' ')[0];
  const [existing] = await db.execute(
    "SELECT id, member_id, check_in, attendance_source FROM attendance WHERE member_id = ? AND DATE(check_in) = ? LIMIT 1",
    [memberId, dateOnly]
  );
  if (existing.length > 0) {
    return {
      id: existing[0].id,
      memberId,
      check_in: existing[0].check_in,
      attendance_source: existing[0].attendance_source || source,
      alreadyMarked: true
    };
  }

  const [result] = await db.execute(
    "INSERT INTO attendance (member_id, check_in, attendance_source, created_by) VALUES (?, ?, ?, ?)",
    [memberId, checkInStr, source, createdBy]
  );
  return { insertId: result.insertId, memberId, check_in: checkInStr, attendance_source: source };
};

exports.getByMember = async (memberId) => {
  const [rows] = await db.execute("SELECT * FROM attendance WHERE member_id = ?", [memberId]);
  return rows;
};

exports.getAllRecords = async (user, { limit = 200 } = {}) => {
  const safeLimit = clampNumber(limit, { fallback: 200, min: 1, max: 5000 });
  // Return joined attendance with member/user name - all users can see all records
  const [rows] = await db.query(
    `SELECT a.id, a.member_id, a.check_in, a.attendance_source, m.name as user_name
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     ORDER BY a.check_in DESC LIMIT ?`,
    [safeLimit]
  );
  return rows;
};

exports.getRecords = async ({ memberId, memberIds, year, month, department, limit = 5000 } = {}) => {
  const safeLimit = clampNumber(limit, { fallback: 5000, min: 1, max: 10000 });
  const filters = buildAttendanceFilters({ memberId, memberIds, year, month, department });
  const [rows] = await db.query(
    `SELECT a.id, a.member_id, a.check_in, a.attendance_source, m.name as user_name, m.department
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     ${filters.whereClause}
     ORDER BY a.check_in DESC
     LIMIT ?`,
    [...filters.params, safeLimit]
  );
  return rows;
};

exports.getRecordsPage = async ({ page = 1, pageSize = 200, memberId, year, month, department } = {}) => {
  const safePage = clampNumber(page, { fallback: 1, min: 1, max: 100000 });
  const safePageSize = clampNumber(pageSize, { fallback: 200, min: 1, max: 500 });
  const offset = (safePage - 1) * safePageSize;
  const filters = buildAttendanceFilters({ memberId, year, month, department });

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     ${filters.whereClause}`,
    filters.params
  );
  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 1;

  const [rows] = await db.query(
    `SELECT a.id, a.member_id, a.check_in, a.attendance_source, m.name as user_name, m.department
     FROM attendance a
     LEFT JOIN members m ON a.member_id = m.id
     ${filters.whereClause}
     ORDER BY a.check_in DESC
     LIMIT ? OFFSET ?`,
    [...filters.params, safePageSize, offset]
  );

  return {
    items: rows,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
      hasPrevPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    },
  };
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
