const db = require("../utils/db");

const MASTER_LABEL = "All Members";
const UNASSIGNED_LABEL = "Unassigned";

function parseDepartments(value) {
    const normalizeDepartmentLabel = (item) => {
        const label = String(item || "").trim();
        if (!label) return "";
        return label.toLowerCase() === "worship" ? "Worshippers" : label;
    };

    if (Array.isArray(value)) {
        return [...new Set(value.map(normalizeDepartmentLabel).filter(Boolean))];
    }

    const raw = String(value || "").trim();
    if (!raw) return [];

    if (raw.startsWith("[")) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return [...new Set(parsed.map(normalizeDepartmentLabel).filter(Boolean))];
            }
        } catch (err) {
            // Fall back to comma-separated parsing below.
        }
    }

    return [...new Set(raw.split(",").map(normalizeDepartmentLabel).filter(Boolean))];
}

function serializeDepartments(value) {
    const departments = parseDepartments(value);
    return departments.length ? departments.join(", ") : null;
}

function attachDepartments(row) {
    if (!row) return row;
    return { ...row, departments: parseDepartments(row.department) };
}

function clampNumber(value, { fallback, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function buildMemberFilters({ search, address, department, hasPhone } = {}) {
    const conditions = [];
    const params = [];

    const normalizedSearch = String(search || "").trim();
    if (normalizedSearch) {
        conditions.push("(name LIKE ? OR phone LIKE ? OR attendance_code LIKE ?)");
        const pattern = `%${normalizedSearch}%`;
        params.push(pattern, pattern, pattern);
    }

    const normalizedAddress = String(address || "").trim();
    if (normalizedAddress) {
        conditions.push("address LIKE ?");
        params.push(`%${normalizedAddress}%`);
    }

    const normalizedDepartment = String(department || "").trim();
    if (normalizedDepartment && normalizedDepartment !== MASTER_LABEL) {
        if (normalizedDepartment === UNASSIGNED_LABEL) {
            conditions.push("(department IS NULL OR TRIM(department) = '')");
        } else {
            conditions.push("FIND_IN_SET(?, REPLACE(IFNULL(department, ''), ', ', ',')) > 0");
            params.push(normalizedDepartment);
        }
    }

    if (hasPhone) {
        conditions.push("phone IS NOT NULL AND TRIM(phone) <> ''");
    }

    return {
        whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
}

function normalizePageResult(rows, page, pageSize, totalItems) {
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
    return {
        items: rows.map(attachDepartments),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        },
    };
}

exports.createMember = async (member) => {
    const { name, gender, department, departments, phone, address, photo_url, created_by } = member;
    const serializedDepartments = serializeDepartments(departments ?? department);
    const [result] = await db.execute(
        "INSERT INTO members (name,gender,department,phone,photo_url,address,created_by) VALUES (?,?,?,?,?,?,?)",
        [name, gender || null, serializedDepartments, phone, photo_url || null, address, created_by]
    );
    const attendanceCode = `CHM-${String(result.insertId).padStart(6, "0")}`;
    await db.execute("UPDATE members SET attendance_code = ? WHERE id = ?", [attendanceCode, result.insertId]);
    return result.insertId;
};

exports.getMembersByUser = async (userId, role) => {
    // All users (admin and normal) can see all members
    const [rows] = await db.execute("SELECT * FROM members ORDER BY id ASC");
    return rows.map(attachDepartments);
};

exports.getMembersPage = async ({ page = 1, pageSize = 20, search, address, department } = {}) => {
    const safePage = clampNumber(page, { fallback: 1, min: 1, max: 100000 });
    const safePageSize = clampNumber(pageSize, { fallback: 20, min: 1, max: 100 });
    const offset = (safePage - 1) * safePageSize;
    const filters = buildMemberFilters({ search, address, department });

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM members
         ${filters.whereClause}`,
        filters.params
    );
    const totalItems = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
        `SELECT id, name, gender, department, phone, address, photo_url, attendance_code, created_by, created_at
         FROM members
         ${filters.whereClause}
         ORDER BY id ASC
         LIMIT ? OFFSET ?`,
        [...filters.params, safePageSize, offset]
    );

    return normalizePageResult(rows, safePage, safePageSize, totalItems);
};

exports.getMemberSummaries = async ({ search, address, department, hasPhone = false, limit = 2000 } = {}) => {
    const safeLimit = clampNumber(limit, { fallback: 2000, min: 1, max: 5000 });
    const filters = buildMemberFilters({ search, address, department, hasPhone });
    const [rows] = await db.query(
        `SELECT id, name, gender, department, phone, address, attendance_code
         FROM members
         ${filters.whereClause}
         ORDER BY name ASC, id ASC
         LIMIT ?`,
        [...filters.params, safeLimit]
    );
    return rows.map(attachDepartments);
};

exports.getDepartmentSummary = async () => {
    const [rows] = await db.execute("SELECT department FROM members");
    const counts = new Map();
    const totalMembers = rows.length;

    for (const row of rows) {
        const departments = parseDepartments(row.department);
        if (!departments.length) {
            counts.set(UNASSIGNED_LABEL, (counts.get(UNASSIGNED_LABEL) || 0) + 1);
            continue;
        }

        for (const department of departments) {
            counts.set(department, (counts.get(department) || 0) + 1);
        }
    }

    return {
        totalMembers,
        departments: [...counts.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ name, count })),
    };
};

// Promise-based helper for exports and other flows
exports.getAll = async (user) => {
    // All users (admin and normal) can see all members
    const [rows] = await db.execute("SELECT * FROM members ORDER BY id ASC");
    return rows.map(attachDepartments);
};

exports.getById = async (id) => {
    const [rows] = await db.execute("SELECT * FROM members WHERE id = ?", [id]);
    return attachDepartments(rows[0]);
};

exports.getMemberByName = async (name) => {
    const [rows] = await db.execute("SELECT * FROM members WHERE name = ?", [name]);
    return attachDepartments(rows[0]);
};

exports.getMemberByAttendanceCode = async (attendanceCode) => {
    const [rows] = await db.execute("SELECT * FROM members WHERE attendance_code = ? LIMIT 1", [attendanceCode]);
    return attachDepartments(rows[0]);
};

exports.findByName = async (name) => {
    const [rows] = await db.execute(
        "SELECT * FROM members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))",
        [name]
    );
    return rows.map(attachDepartments);
};

exports.deleteById = async (id) => {
    // Delete all related attendance records first
    await db.execute("DELETE FROM attendance WHERE member_id = ?", [id]);
    
    // Delete all related donations records
    await db.execute("DELETE FROM donations WHERE donor_name = (SELECT name FROM members WHERE id = ?)", [id]);
    
    // Now delete the member
    const [result] = await db.execute("DELETE FROM members WHERE id = ?", [id]);
    return result.affectedRows;
};

exports.updateById = async (id, { name, gender, department, departments, phone, address, photo_url }) => {
    const serializedDepartments = serializeDepartments(departments ?? department);
    const [result] = await db.execute(
        "UPDATE members SET name = ?, gender = ?, department = ?, phone = ?, photo_url = ?, address = ? WHERE id = ?",
        [name, gender || null, serializedDepartments, phone, photo_url || null, address, id]
    );
    return result.affectedRows;
};

exports.getStats = async (user) => {
    // All users can see total member count
    const [rows] = await db.execute("SELECT COUNT(*) as total FROM members");
    return rows[0];
};
