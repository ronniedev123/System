// Entry Point for the Backend Server
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
// determine port, try environment then default. we'll attempt to find a free one if default is busy
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// helper to find a free port starting from a given port
const net = require('net');
async function findFreePort(start) {
    return new Promise((resolve) => {
        const tester = net.createServer();
        tester.once('error', () => {
            // port in use, try next
            resolve(findFreePort(start + 1));
        });
        tester.once('listening', () => {
            const { port } = tester.address();
            tester.close(() => resolve(port));
        });
        tester.listen(start, '0.0.0.0');
    });
}

// =====================
// MIDDLEWARE
// =====================

// Parse JSON (and handle parse errors gracefully)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// middleware to convert JSON parse errors into JSON responses
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('JSON parse error:', err.message);
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
});

// CORS (safe version)
app.use(cors({
    origin: true,
    credentials: true
}));

// Keep HTML and service worker assets fresh during preview/deployment sharing.
app.use((req, res, next) => {
    const requestPath = req.path || "";
    const isApiRequest = requestPath.startsWith("/api/");
    const isHtmlRequest = requestPath === "/" || requestPath.endsWith(".html");
    const isMutableStaticAsset =
        requestPath.startsWith("/js/") ||
        requestPath.startsWith("/css/") ||
        requestPath === "/sw.js" ||
        requestPath === "/manifest.webmanifest" ||
        requestPath === "/js/pwa.js";
    const isVersionedAsset =
        requestPath.startsWith("/assets/") ||
        /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(requestPath);

    if (isApiRequest || isHtmlRequest) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    } else if (isMutableStaticAsset) {
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    } else if (isVersionedAsset) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    }

    next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// =====================
// ROUTES
// =====================

const authRoutes = require("./routes/auth");
const membersRoutes = require("./routes/members");
const attendanceRoutes = require("./routes/attendance");
const eventsRoutes = require("./routes/events");
const donationsRoutes = require("./routes/donations");
const announcementsRoutes = require("./routes/announcements");
const weeklyProgramsRoutes = require("./routes/weeklyPrograms");
const worshipSongsRoutes = require("./routes/worshipSongs");
const churchAlbumRoutes = require("./routes/churchAlbum");
const paymentsRoutes = require("./routes/payments");

app.use("/api/auth", authRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/weekly-programs", weeklyProgramsRoutes);
app.use("/api/worship-songs", worshipSongsRoutes);
app.use("/api/church-album", churchAlbumRoutes);
app.use("/api/payments", paymentsRoutes);
app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        service: "church-management-system",
        timestamp: new Date().toISOString()
    });
});

// =====================
// HANDLE FRONTEND ROUTES (IMPORTANT FOR LIVE)
// =====================

// If someone visits root "/", serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// =====================
// START SERVER
// =====================

(async () => {
    try {
        await require("./migrations/run_migrations");
    } catch (e) {
        console.error("Migrations failed, exiting.", e.message);
        process.exit(1);
    }

    const { createAdminIfNotExists } = require("./models/userModel");
    await createAdminIfNotExists().catch(err => console.error(err));

    // if port is specified but in use, find another
    try {
        PORT = await findFreePort(PORT);
    } catch {
        console.warn("Could not determine free port, using configured value.");
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. ` +
                `Please kill the process occupying it or set PORT environment variable to another port.`);
        } else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });
})();
