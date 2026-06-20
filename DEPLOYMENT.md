# Vercel + Backend Deployment Guide

## Quick Setup Checklist

### Phase 1: Backend Deployment (Choose One Platform)

#### Option A: Railway (Recommended - easiest)
1. Sign in to https://railway.app
2. Create a new project → "Deploy from GitHub repo"
3. Connect your `ronniedev123/System` repository
4. Railway will detect `Procfile` → Start command: `npm start`
5. Add a MySQL service:
   - Click "+ Create" → Select "MySQL"
   - Railway will auto-provision and set `DATABASE_URL`
6. Set Environment Variables:
   - `DB_HOST` (from Railway MySQL service)
   - `DB_USER` (from Railway MySQL service)
   - `DB_PASSWORD` (from Railway MySQL service)
   - `DB_NAME=church_db`
   - `JWT_SECRET=your-secret-key-here`
   - `APP_BASE_URL=https://your-app-domain.up.railway.app` (will generate this)
   - `EMAIL_USER=your-email@gmail.com`
   - `EMAIL_PASS=your-app-password`
   - `MPESA_ENV=sandbox` (or production when ready)
   - `MPESA_CONSUMER_KEY=xxx`
   - `MPESA_CONSUMER_SECRET=xxx`
   - `MPESA_SHORTCODE=xxx`
   - `MPESA_PASSKEY=xxx`
   - `BANK_PAYMENT_REDIRECT_URL=your-bank-redirect`
7. Deploy → Copy the generated backend URL

#### Option B: Render.com
1. Sign in to https://render.com
2. Create → "Web Service" → Connect GitHub
3. Select `ronniedev123/System`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add PostgreSQL or MySQL database
7. Set all environment variables from `.env.example`
8. Deploy → Copy the generated URL

#### Option C: Fly.io
1. Install `flyctl` CLI
2. Run: `fly auth login`
3. Run: `fly launch` in your repo directory
4. Follow prompts to set region and create database
5. Update generated `fly.toml` with your env vars
6. Run: `fly deploy`

---

### Phase 2: Update Backend Host in vercel.json

After your backend is deployed:
1. Copy the backend URL (e.g., `https://your-app-domain.up.railway.app`)
2. Open `vercel.json` in your repo
3. Replace `your-backend-host.com` with your actual backend URL
4. Commit and push to GitHub

Example after update:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-app-domain.up.railway.app/api/$1"
    }
  ]
}
```

---

### Phase 3: Frontend Deployment to Vercel

1. Sign in to https://vercel.com
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Search and select `ronniedev123/System`
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: Leave blank
   - **Output Directory**: Leave blank
6. Click "Deploy"
7. Wait for deployment to complete
8. Copy your Vercel URL (e.g., `https://system-ronnie.vercel.app`)

---

### Phase 4: Update Backend APP_BASE_URL

Go back to your backend platform (Railway/Render/Fly):

Update environment variables:
- `APP_BASE_URL=https://system-ronnie.vercel.app` (your Vercel URL)
- `BANK_PAYMENT_SUCCESS_URL=https://system-ronnie.vercel.app/donations.html?payment=success`
- `BANK_PAYMENT_CANCEL_URL=https://system-ronnie.vercel.app/donations.html?payment=cancelled`
- Leave `MPESA_CALLBACK_URL` empty (app will auto-use `APP_BASE_URL + /api/payments/mpesa/callback`)

Redeploy/restart backend.

---

### Phase 5: Test the Full Stack

1. Open your Vercel URL in browser
2. Login page should load
3. Try to log in → should hit backend API
4. Check browser DevTools → Network tab
   - API calls should go to `/api/*`
   - Vercel proxies them to backend
5. Verify `/api/health` works on backend directly

---

## Environment Variables Reference

Copy from `.env.example` and fill in:

```
DB_HOST=                    # From your database provider
DB_USER=                    # From your database provider
DB_PASSWORD=                # From your database provider
DB_NAME=church_db           # Default is fine
PORT=                       # Leave blank (platform provides)
JWT_SECRET=your-secret-key  # Generate a random string
APP_BASE_URL=https://...    # Your Vercel URL
EMAIL_USER=                 # Gmail address (optional)
EMAIL_PASS=                 # Gmail app password (optional)
MPESA_ENV=sandbox           # Change to production later
MPESA_CONSUMER_KEY=         # From Safaricom Daraja
MPESA_CONSUMER_SECRET=      # From Safaricom Daraja
MPESA_SHORTCODE=            # Paybill/Till shortcode
MPESA_PASSKEY=              # Daraja STK passkey
MPESA_CALLBACK_URL=         # Leave empty
BANK_PAYMENT_REDIRECT_URL=  # Your bank checkout URL
BANK_PAYMENT_SUCCESS_URL=   # Optional (defaults to generated)
BANK_PAYMENT_CANCEL_URL=    # Optional (defaults to generated)
```

---

## Troubleshooting

### "API calls return 404"
- Check that backend URL in `vercel.json` is correct and running
- Verify backend environment variables are set
- Check Vercel deployment logs

### "Database connection error on backend"
- Confirm DB credentials in backend environment variables
- Ensure database service is running on platform
- Check firewall/IP allowlist if needed

### "Login doesn't work"
- Check JWT_SECRET is set on backend
- Verify `/api/auth/login` endpoint responds directly to backend URL
- Check browser console for CORS errors

### "M-Pesa not working"
- Confirm MPESA_ENV matches (sandbox vs production)
- Check Daraja credentials are correct
- Verify APP_BASE_URL is publicly accessible

---

## Next Steps After Deployment

1. Set up a custom domain for both frontend and backend (optional)
2. Enable HTTPS (Vercel does automatically)
3. Set up continuous deployment (GitHub actions)
4. Monitor logs and uptime
5. Configure M-Pesa production credentials when ready
6. Backup your database regularly

