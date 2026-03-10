# Deploy Without VPS (GoDaddy + Vercel + Render)

## 1) Deploy Frontend to Vercel
1. Push this project to GitHub.
2. In Vercel, import the repo.
3. Framework preset: `Other` (static site).
4. Root directory: project root (`new-website`).
5. Deploy.

## 2) Deploy Backend to Render
1. In Render, create a new `Web Service` from same repo.
2. Root Directory: `backend`
3. Build Command: empty
4. Start Command: `npm start`
5. Add env vars:
- `NODE_ENV=production`
- `FRONTEND_URL=https://www.piplanisprint.com`
- `ALLOWED_ORIGINS=https://www.piplanisprint.com,https://piplanisprint.com`
- `TWILIO_ACCOUNT_SID` (optional for live OTP SMS)
- `TWILIO_AUTH_TOKEN` (optional)
- `TWILIO_FROM_NUMBER` (optional)

## 3) Connect Domain in GoDaddy
Add these DNS records:
1. `CNAME` host `www` -> your Vercel target (shown by Vercel)
2. `A` host `@` -> `76.76.21.21` (Vercel apex IP)
3. `CNAME` host `api` -> your Render hostname (shown by Render)

## 4) Add Custom Domains
1. In Vercel domains:
- `www.piplanisprint.com`
- `piplanisprint.com`
2. In Render custom domains:
- `api.piplanisprint.com`

## 5) Verify
1. Frontend: `https://www.piplanisprint.com`
2. API health: `https://api.piplanisprint.com/api/health`
3. Place a test order + OTP flow.

## Notes
- Frontend auto-uses `https://api.piplanisprint.com/api` on non-localhost.
- Local development still uses `http://127.0.0.1:8081/api`.
- Current backend uses `db.json` file storage; Render disk is ephemeral. For long-term persistence, migrate to PostgreSQL.
