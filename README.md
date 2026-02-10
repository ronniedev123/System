# Church Management System

Minimal README to run the project locally and DB / env expectations.

Prerequisites
- Node.js 18+ (or compatible)
- MySQL database

Setup
1. Copy `.env.example` to `.env` and update values (or set environment variables):

Required env vars:
- `DB_HOST` (default: localhost)
- `DB_USER` (default: root)
- `DB_PASSWORD` (default: Login@ronald2004)
- `DB_NAME` (default: church_db)
- `PORT` (optional, default 3000)
- `JWT_SECRET` (recommended, default used if missing)
- `EMAIL_USER` (optional, for sending emails)
- `EMAIL_PASS` (optional, for sending emails)

2. Install dependencies and start server

```bash
cd backend
npm install
npm run start
```

Database schema (expected tables & important columns)
- `users` (id, name, email, password, role)
- `members` (id, name, email, phone, address, created_by, created_at)
- `attendance` (id, member_id, check_in, check_out NULLABLE, created_by)
- `events` (id, title, description, event_date, created_by)
- `donations` (id, donor_name, amount, donation_date, created_by, description)
- `announcements` (id, title, message, created_by, created_at)

Notes
- The server creates an `admin@church.com` user with password `admin123` on startup if missing.
- To seed sample data use the seed scripts in `backend/seeds/`:
  - `node backend/seeds/seed_sample_data.js` (members + attendance)
  - `node backend/seeds/seed_donations_events.js` (donations + events)

Frontend
- Open the `frontend/index.html` in a browser and login as admin to access admin pages.

Known behavior
- JWT tokens default to `JWT_SECRET` or `secretkey` if not set.
- Email sending requires valid `EMAIL_USER`/`EMAIL_PASS`.

If you want, I can add SQL migration files to create all tables automatically.
