// backend/utils/db.js
require("dotenv").config();

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

function normalizeParams(params = []) {
    return params.map((value) => value === undefined ? null : value);
}

if (tursoUrl) {
    const { createClient } = require("@libsql/client");
    const client = createClient({
        url: tursoUrl,
        authToken: tursoToken,
    });

    async function execute(sql, params = []) {
        const result = await client.execute({
            sql,
            args: normalizeParams(params),
        });

        const rows = result.rows.map((row) => ({ ...row }));
        const meta = {
            insertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
            affectedRows: result.rowsAffected || 0,
        };

        return rows.length || /^\s*(select|pragma)\b/i.test(sql) ? [rows, meta] : [meta];
    }

    module.exports = {
        dialect: "sqlite",
        execute,
        query: execute,
        end: async () => client.close(),
    };
} else {
    const mysql = require("mysql2/promise");

    const db = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "Login@ronald2004",
        database: process.env.DB_NAME || "church_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    db.dialect = "mysql";
    module.exports = db;
}
