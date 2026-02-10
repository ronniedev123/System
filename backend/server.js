// Entry Point for the Backend Server
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/auth");
const membersRoutes = require("./routes/members");
const attendanceRoutes = require("./routes/attendance");
const eventsRoutes = require("./routes/events");
const donationsRoutes = require("./routes/donations");
const announcementsRoutes = require("./routes/announcements");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
	origin: "*",
	credentials: true
}));
app.use(express.json());


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/announcements", announcementsRoutes);

// Run migrations then ensure admin user exists and start server
(async () => {
	try {
		await require('./migrations/run_migrations');
	} catch (e) {
		console.error('Migrations failed, exiting.', e.message);
		process.exit(1);
	}

	const { createAdminIfNotExists } = require("./models/userModel");
	await createAdminIfNotExists().catch(err => console.error(err));

	app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
})();
