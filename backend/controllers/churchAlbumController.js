const db = require("../utils/db");

const MANAGER_ROLES = new Set(["admin", "user"]);

function isValidDataUrl(value, allowedPrefix) {
    const raw = String(value || "").trim();
    return raw.startsWith(`data:${allowedPrefix}`);
}

exports.getImages = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, title, description, image_name, image_data, mime_type, created_at
             FROM church_album
             ORDER BY created_at DESC, id DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createImage = async (req, res) => {
    try {
        if (!req.user || !MANAGER_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const title = String(req.body?.title || "").trim();
        const description = String(req.body?.description || "").trim();
        const imageName = String(req.body?.image_name || "").trim();
        const imageData = String(req.body?.image_data || "").trim();
        const mimeType = String(req.body?.mime_type || "").trim();

        if (!title || !imageName || !imageData || !mimeType) {
            return res.status(400).json({ error: "Title and image file are required" });
        }

        if (!mimeType.startsWith("image/") || !isValidDataUrl(imageData, "image/")) {
            return res.status(400).json({ error: "Only image files are allowed" });
        }

        const [result] = await db.execute(
            `INSERT INTO church_album (title, description, image_name, image_data, mime_type, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, description || null, imageName, imageData, mimeType, req.user.id]
        );

        res.status(201).json({ message: "Album image added", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        if (!req.user || !MANAGER_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid id" });
        }

        const [result] = await db.execute("DELETE FROM church_album WHERE id = ?", [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: "Image not found" });
        }

        res.json({ message: "Album image deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
