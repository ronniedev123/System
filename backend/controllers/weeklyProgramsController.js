const db = require("../utils/db");

const EDITOR_ROLES = new Set(["admin", "user"]);

function daySortValue(day) {
    const map = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 7
    };
    return map[String(day || "").trim().toLowerCase()] || 99;
}

exports.getPrograms = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, day_of_week, program_name, time_slot, venue, sort_order
             FROM weekly_programs
             ORDER BY sort_order ASC, id ASC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createProgram = async (req, res) => {
    try {
        if (!req.user || !EDITOR_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { day, program, time, venue } = req.body;
        if (!day || !program || !time || !venue) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const sortOrder = daySortValue(day);
        const [result] = await db.execute(
            `INSERT INTO weekly_programs (day_of_week, program_name, time_slot, venue, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [day, program, time, venue, sortOrder, req.user.id]
        );
        res.status(201).json({ message: "Program added", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProgram = async (req, res) => {
    try {
        if (!req.user || !EDITOR_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid id" });

        const { day, program, time, venue } = req.body;
        if (!day || !program || !time || !venue) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const sortOrder = daySortValue(day);
        const [result] = await db.execute(
            `UPDATE weekly_programs
             SET day_of_week = ?, program_name = ?, time_slot = ?, venue = ?, sort_order = ?
             WHERE id = ?`,
            [day, program, time, venue, sortOrder, id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: "Program not found" });
        res.json({ message: "Program updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteProgram = async (req, res) => {
    try {
        if (!req.user || !EDITOR_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid id" });

        const [result] = await db.execute("DELETE FROM weekly_programs WHERE id = ?", [id]);
        if (!result.affectedRows) return res.status(404).json({ error: "Program not found" });
        res.json({ message: "Program deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
