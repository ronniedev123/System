// backend/models/userModel.js
const db = require("../utils/db");
const bcrypt = require("bcryptjs");

// -----------------------------
// Create Admin If Not Exists
// -----------------------------
const createAdminIfNotExists = async () => {
    try {
        const phone = "admin@church.com";
        const password = "admin123";
        const role = "admin";

        const [rows] = await db.execute("SELECT * FROM users WHERE role = 'admin' LIMIT 1");

        if (rows.length === 0) {
            const hash = await bcrypt.hash(password, 10);
            await db.execute(
                "INSERT INTO users (name, phone, password, role, is_approved, is_blocked) VALUES (?, ?, ?, ?, ?, ?)",
                ["Admin", phone, hash, role, 1, 0]
            );
            console.log("Admin user created: admin@church.com / admin123");
        } else {
            console.log("Admin user already exists");
        }
    } catch (err) {
        console.error("Error creating admin:", err);
    }
};

// -----------------------------
// Get User by Phone
// -----------------------------
const getUserByPhone = async (phone) => {
    const [rows] = await db.execute("SELECT * FROM users WHERE phone = ?", [phone]);
    return rows[0];
};

// -----------------------------
// Create New User
// -----------------------------
const createUser = async ({ name, phone, password, role = "normaluser" }) => {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
        "INSERT INTO users (name, phone, password, role, is_approved, is_blocked) VALUES (?, ?, ?, ?, ?, ?)",
        [name, phone, hash, role, 1, 0]
    );
    return result.insertId;
};

module.exports = {
    createAdminIfNotExists,
    getUserByPhone,
    createUser,
};
