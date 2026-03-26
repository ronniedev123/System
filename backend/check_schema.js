(async () => {
  const db = require("./utils/db");

  const required = {
    users: [
      "id",
      "name",
      "phone",
      "password",
      "role",
      "is_approved",
      "is_blocked",
      "created_at",
    ],
    members: ["id", "name", "gender", "department", "phone", "photo_url", "address", "created_by", "created_at"],
    events: ["id", "title", "description", "event_date", "created_by", "created_at"],
    donations: ["id", "donor_name", "amount", "donation_date", "contribution_type", "created_by", "description", "created_at"],
    announcements: ["id", "title", "message", "created_by", "created_at"],
    attendance: ["id", "member_id", "check_in", "check_out", "created_by", "created_at"],
    weekly_programs: ["id", "day_of_week", "program_name", "time_slot", "venue", "sort_order", "created_by", "created_at"],
  };

  let hasFailure = false;
  const fail = (msg) => {
    hasFailure = true;
    console.error(`FAIL: ${msg}`);
  };
  const pass = (msg) => console.log(`PASS: ${msg}`);
  const warn = (msg) => console.warn(`WARN: ${msg}`);

  try {
    const tableExists = {};
    for (const [table, requiredCols] of Object.entries(required)) {
      const [existsRows] = await db.execute(
        `SELECT COUNT(*) as count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );

      if (!existsRows[0].count) {
        tableExists[table] = false;
        fail(`Missing table '${table}'`);
        continue;
      }
      tableExists[table] = true;
      pass(`Table '${table}' exists`);

      const [colRows] = await db.execute(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      const colSet = new Set(colRows.map((r) => r.COLUMN_NAME));

      for (const col of requiredCols) {
        if (!colSet.has(col)) fail(`Missing column '${table}.${col}'`);
      }
    }

    const [idxRows] = await db.execute(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND INDEX_NAME = 'uniq_users_phone'`
    );
    if (!idxRows[0].count) {
      fail("Missing unique index 'uniq_users_phone' on users.phone");
    } else {
      pass("Unique index 'uniq_users_phone' exists");
    }

    const [nullPhoneRows] = await db.execute(
      `SELECT COUNT(*) as count FROM users WHERE phone IS NULL OR phone = ''`
    );
    if (nullPhoneRows[0].count > 0) {
      fail(`Found ${nullPhoneRows[0].count} user(s) without phone`);
    } else {
      pass("All users have phone values");
    }

    if (tableExists.weekly_programs) {
      const [weeklyCountRows] = await db.execute(`SELECT COUNT(*) as count FROM weekly_programs`);
      if (weeklyCountRows[0].count === 0) {
        warn("weekly_programs table is empty (this is allowed, but page will show no programs).");
      } else {
        pass(`weekly_programs has ${weeklyCountRows[0].count} row(s)`);
      }
    }
  } catch (err) {
    hasFailure = true;
    console.error("FAIL: Schema check error:", err.message);
  } finally {
    await db.end().catch(() => {});
  }

  if (hasFailure) {
    console.error("\nSchema check failed.");
    process.exit(1);
  } else {
    console.log("\nSchema check passed.");
    process.exit(0);
  }
})();
