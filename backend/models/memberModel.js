const db = require("../utils/db");

exports.createMember = async (member) => {
    const { name, email, phone, address, created_by } = member;
    const [result] = await db.execute(
        "INSERT INTO members (name,email,phone,address,created_by) VALUES (?,?,?,?,?)",
        [name,email,phone,address,created_by]
    );
    return result.insertId;
};

exports.getMembersByUser = async (userId, role) => {
    // All users (admin and normal) can see all members
    const [rows] = await db.execute("SELECT * FROM members ORDER BY id DESC");
    return rows;
};

// Promise-based helper for exports and other flows
exports.getAll = async (user) => {
    // All users (admin and normal) can see all members
    const [rows] = await db.execute("SELECT * FROM members ORDER BY id DESC");
    return rows;
};

exports.getById = async (id) => {
    const [rows] = await db.execute("SELECT * FROM members WHERE id = ?", [id]);
    return rows[0];
};

exports.getMemberByName = async (name) => {
    const [rows] = await db.execute("SELECT * FROM members WHERE name = ?", [name]);
    return rows[0];
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

exports.updateById = async (id, { name, email, phone, address }) => {
    const [result] = await db.execute(
        "UPDATE members SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
        [name, email, phone, address, id]
    );
    return result.affectedRows;
};

exports.getStats = async (user) => {
    // All users can see total member count
    const [rows] = await db.execute("SELECT COUNT(*) as total FROM members");
    return rows[0];
};
