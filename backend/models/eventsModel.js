const db = require("../utils/db");

exports.addEvent = async ({ title, description, date, createdBy }) => {
    const [result] = await db.execute(
        "INSERT INTO events (title, description, event_date, created_by) VALUES (?, ?, ?, ?)",
        [title, description, date, createdBy]
    );
    return { insertId: result.insertId, title, description, date };
};

exports.getAll = async (user) => {
    // Allow all authenticated users to view events
    const [rows] = await db.execute(
        `SELECT id, title, description, event_date as date, created_by FROM events ORDER BY event_date DESC`
    );
    return rows;
};

exports.getById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id, title, description, event_date as date, created_by FROM events WHERE id = ?`,
        [id]
    );
    return rows[0];
};

exports.deleteById = async (id) => {
    const [result] = await db.execute("DELETE FROM events WHERE id = ?", [id]);
    return result.affectedRows;
};
