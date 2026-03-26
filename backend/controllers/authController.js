const db = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

// Register new normal user (pending approval)
exports.registerUser = async (req, res) => {
    try {
        const { name, phone, password, role } = req.body;
        const selectedRole = role || "normaluser";
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        const allowedRoles = new Set(["user", "normaluser"]);
        if (!normalizedName || !normalizedPhone || !password) {
            return res.status(400).json({ message: "All fields required" });
        }
        if (!allowedRoles.has(selectedRole)) {
            return res.status(400).json({ error: "Invalid role. Only user and normaluser are allowed." });
        }

        const [existing] = await db.query("SELECT id FROM users WHERE phone = ?", [normalizedPhone]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Phone already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const isApproved = selectedRole === "normaluser" ? 1 : 0;
        await db.query(
            "INSERT INTO users (name, phone, password, role, is_approved, is_blocked) VALUES (?, ?, ?, ?, ?, ?)",
            [normalizedName, normalizedPhone, hashedPassword, selectedRole, isApproved, 0]
        );

        if (selectedRole === "user") {
            return res.status(201).json({ message: "Account created successfully. Wait for admin approval before login." });
        }
        res.status(201).json({ message: "Account created successfully. You can now login." });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Phone already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Admin-only user creation for dashboard user management
exports.createUserByAdmin = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { name, phone, password, role } = req.body;
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        const allowedRoles = new Set(["user", "admin"]);
        if (!normalizedName || !normalizedPhone || !password || !role) {
            return res.status(400).json({ message: "All fields required" });
        }
        if (!allowedRoles.has(role)) {
            return res.status(400).json({ error: "Invalid role. Only user and admin are allowed." });
        }

        const [existing] = await db.query("SELECT id FROM users WHERE phone = ?", [normalizedPhone]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Phone already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, password, role, is_approved, is_blocked) VALUES (?, ?, ?, ?, ?, ?)",
            [normalizedName, normalizedPhone, hashedPassword, role, 1, 0]
        );

        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Phone already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Login
exports.loginUser = async (req, res) => {
    try {
        const rawIdentifier = req.body?.phone ?? req.body?.email ?? req.body?.identifier;
        const identifier = String(rawIdentifier || "").trim();
        const password = req.body?.password;
        if (!identifier || !password) {
            return res.status(400).json({ error: "Phone/email and password are required" });
        }

        const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [identifier]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        if (Number(user.is_blocked) === 1) {
            return res.status(403).json({ error: "Account is blocked. Contact admin." });
        }
        if (user.role === "user" && Number(user.is_approved) !== 1) {
            return res.status(403).json({ error: "Account pending admin approval" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
            expiresIn: "12h",
        });

        res.json({ token, role: user.role, name: user.name });
    } catch (err) {
        console.error("LOGIN ERROR:", err.stack || err);
        res.status(500).json({ error: "Server error" });
    }
};

// Get list of users (admin only)
exports.getUsers = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const [rows] = await db.execute("SELECT id, name, phone, role, is_approved, is_blocked, created_at FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("GET USERS ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// Admin approves pending user accounts
exports.approveUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const [result] = await db.execute(
            "UPDATE users SET is_approved = 1 WHERE id = ?",
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User approved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin blocks/unblocks user accounts
exports.setUserBlocked = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        const blocked = Boolean(req.body && req.body.blocked);
        if (!id) {
            return res.status(400).json({ error: "Invalid user id" });
        }
        if (id === Number(req.user.id)) {
            return res.status(400).json({ error: "You cannot block your own account" });
        }

        const [result] = await db.execute(
            "UPDATE users SET is_blocked = ? WHERE id = ?",
            [blocked ? 1 : 0, id]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: blocked ? "User blocked successfully" : "User unblocked successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin edits user details
exports.updateUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const { name, phone, role, password } = req.body;
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        if (!normalizedName || !normalizedPhone || !role) {
            return res.status(400).json({ error: "Name, phone and role are required" });
        }
        if (!["admin", "user", "normaluser"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }
        if (id === Number(req.user.id) && role !== "admin") {
            return res.status(400).json({ error: "You cannot remove your own admin role" });
        }

        const [existing] = await db.execute("SELECT id FROM users WHERE phone = ? AND id <> ?", [normalizedPhone, id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Phone already registered" });
        }

        if (password && String(password).trim()) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                "UPDATE users SET name = ?, phone = ?, role = ?, password = ? WHERE id = ?",
                [normalizedName, normalizedPhone, role, hashedPassword, id]
            );
        } else {
            await db.execute(
                "UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?",
                [normalizedName, normalizedPhone, role, id]
            );
        }

        res.json({ message: "User updated successfully" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "Phone already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Admin deletes user accounts
exports.deleteUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "Invalid user id" });
        }
        if (id === Number(req.user.id)) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }

        const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
