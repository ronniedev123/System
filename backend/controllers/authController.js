const db = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";


// Register new user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        // Check if user already exists
        const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, role || "user"]
        );

        res.status(201).json({ message: "User created successfully" });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
        return res.status(400).json({ error: "Email and password are required" });

        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        // Generate token
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
            expiresIn: "12h",
        });

        res.json({ token, role: user.role, name: user.name });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// Get list of users (requires authentication)
exports.getUsers = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error('GET USERS ERROR:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
