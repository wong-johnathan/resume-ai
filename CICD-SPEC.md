# CI/CD & Hosting Plan — Resume App

## Context

The resume app is a monorepo with a React/Vite frontend and an Express/Node backend using Prisma + PostgreSQL. The goal is to host it for free using Vercel as the primary platform. The backend cannot run on Vercel's standard serverless runtime because it uses **Puppeteer + headless Chromium** (~200MB) for PDF generation, which exceeds Vercel's free tier function size limits and 10s timeout. The solution splits hosting across three free services, using Vercel rewrites to make the split invisible to the frontend.

---

## Architecture

| Layer | Service | Why |
|-------|---------|-----|
| Frontend | **Vercel** (free) | Static Vite build, auto-deploy from GitHub |
| Backend | **Railway** (free tier — $5/mo credit) | Supports Docker/Node natively, no serverless restrictions, handles Puppeteer fine |
| Database | **Supabase** (free tier) | Already configured in the project |

Vercel acts as a **proxy** for API calls via rewrites — the browser calls `/api/...` on the Vercel domain, Vercel forwards to Railway. This avoids all cross-origin cookie/session issues without any client code changes.

```
Browser → Vercel (static frontend)
               ↓ /api/* rewrite (proxy)
          Railway (Express backend)
               ↓
          Supabase (PostgreSQL)
```

---

## Files to Create/Modify

### 1. `client/vercel.json` *(create)*
Proxies all `/api/*` requests to the Railway backend URL. This keeps the session cookie on the Vercel domain and requires zero client-side code changes.

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_RAILWAY_URL/api/:path*"
    }
  ]
}
```

### 2. `server/src/app.ts` *(modify)*
Two production-required changes:
- **Trust proxy** — Railway sits behind a reverse proxy; Express needs this for `req.ip` and secure cookies to work correctly.
- **Secure session cookies** — In production, cookies must be `secure: true` and `sameSite: 'none'` since requests arrive via the Vercel proxy.

```ts
// After app creation, before session middleware:
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Update session cookie config:
cookie: {
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}
```

### 3. `server/Dockerfile` *(modify)*
The existing Dockerfile runs in dev mode (`npm run dev`). Update CMD for production:

```dockerfile
# Build step
RUN npm run build
RUN npx prisma generate

# Production start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

> Note: Switch from `prisma db push` (dev) to `prisma migrate deploy` (prod) for safer schema management.

---

## Setup Steps

### Step 1: Supabase (Database)
Already configured. Confirm you have:
- `DATABASE_URL` — transaction pooler URL (port 6543)
- `DIRECT_URL` — direct connection URL (port 5432)

Run the initial migration from local:
```bash
cd server && npx prisma migrate deploy
```

### Step 2: Railway (Backend)
1. Create account at railway.app, connect GitHub repo
2. New project → Deploy from GitHub repo → select this repo
3. Set **Root Directory** to `server`
4. Railway will detect the Dockerfile automatically
5. Set all environment variables in Railway dashboard:
   ```
   DATABASE_URL=...
   DIRECT_URL=...
   SESSION_SECRET=<32+ char random string>
   OPENAI_API_KEY=sk-...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_CALLBACK_URL=https://YOUR_RAILWAY_URL/api/auth/google/callback
   NODE_ENV=production
   CLIENT_URL=https://YOUR_VERCEL_URL
   PORT=3000
   ```
6. Note your Railway public URL (e.g., `https://resume-app-server.up.railway.app`)
7. Enable auto-deploy from `main` branch (default in Railway)

### Step 3: Vercel (Frontend)
1. Create account at vercel.com, connect GitHub repo
2. New project → Import from GitHub
3. Set **Root Directory** to `client`
4. Framework preset: **Vite** (auto-detected)
5. Build command: `npm run build` | Output: `dist`
6. No environment variables needed (API URL is handled by rewrites)
7. After first deploy, note your Vercel URL (e.g., `https://resume-app.vercel.app`)
8. Update Railway env var: `CLIENT_URL=https://resume-app.vercel.app`
9. Update `client/vercel.json` with the Railway URL, commit and push

### Step 4: Google OAuth Callback URLs
In Google Cloud Console → OAuth credentials, add:
```
https://YOUR_RAILWAY_URL/api/auth/google/callback
```

---

## CI/CD Flow

Both platforms auto-deploy on push to `main` — no GitHub Actions required for deployments.

```
git push origin main
       ↓
  GitHub repo
  ├── Vercel detects change → builds client → deploys static
  └── Railway detects change → builds Docker image → deploys server
```

**Optional: GitHub Actions for PR quality gate**
Add `.github/workflows/ci.yml` to type-check before merge:
```yaml
name: CI
on: [pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npm run build --workspace=client
      - run: npm run build --workspace=server
```

---

## Verification

1. Push code to GitHub `main` branch
2. Watch Railway build logs — confirm `prisma migrate deploy` succeeds and server starts on port 3000
3. Watch Vercel build logs — confirm Vite build succeeds
4. Visit Vercel URL → confirm frontend loads
5. Click "Login with Google" → OAuth flow completes → dashboard accessible
6. Create a resume, download PDF → confirms Puppeteer works on Railway
7. Generate a cover letter → confirms AI/streaming works end-to-end
8. Check Railway logs for any errors

---

## Free Tier Limits to Watch

| Service | Limit |
|---------|-------|
| Vercel Hobby | 100GB bandwidth/mo, unlimited deploys |
| Railway | $5 free credit/mo (~500 hours of a 512MB instance) |
| Supabase Free | 500MB DB storage, 2GB bandwidth, 50MB file storage |
