// backend/models/userModel.js
const db = require("../utils/db");
const bcrypt = require("bcrypt");

// -----------------------------
// Create Admin If Not Exists
// -----------------------------
const createAdminIfNotExists = async () => {
    try {
        const email = "admin@church.com";
        const password = "admin123";
        const role = "admin";

        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

        if (rows.length === 0) {
        const hash = await bcrypt.hash(password, 10);
        await db.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            ["Admin", email, hash, role]
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
// Get User by Email
// -----------------------------
const getUserByEmail = async (email) => {
  const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0]; // returns undefined if not found
};

// -----------------------------
// Create New User
// -----------------------------
const createUser = async ({ name, email, password, role = "user" }) => {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [name, email, hash, role]
    );
    return result.insertId; // returns the new user ID
};

module.exports = {
    createAdminIfNotExists,
    getUserByEmail,
    createUser,
};
