# Resume AI

An AI-powered resume builder and job application assistant. Build resumes from a structured profile, choose from multiple templates, export PDFs, track job applications on a Kanban board, and use Claude AI to tailor resumes and generate cover letters for specific job postings.

## Features

- **Profile builder** — structured input for experience, education, skills, and certifications
- **Resume templates** — 4 designs (Modern, Classic, Minimal, Executive) with PDF export via Puppeteer
- **AI resume tailoring** — Claude rewrites your resume's summary, bullets, and skill order to match a job description (max 3 amendments per job posting)
- **AI cover letter generation** — SSE-streamed cover letter in your choice of tone (Professional, Conversational, Enthusiastic)
- **AI summary improvement** — refine your profile summary for a target role
- **Job tracker** — Kanban board with drag-and-drop, custom status columns, and per-job notes
- **Amendment history** — every AI action per job is logged and viewable

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, React Router v7 |
| State | Zustand (UI), React Hook Form + Zod (forms) |
| Backend | Express + TypeScript, Passport.js (Google OAuth) |
| Database | PostgreSQL + Prisma 5 |
| AI | Claude via OpenAI-compatible SDK (`OPENAI_API_KEY`) |
| PDF | Puppeteer + headless Chromium |
| Hosting | Vercel (frontend) + Railway (backend) + Supabase (database) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Google OAuth credentials
- Claude API key (via OpenAI-compatible endpoint)

### Installation

```bash
git clone https://github.com/wong-johnathan/resume-ai.git
cd resume-ai
npm install
```

### Environment Setup

Copy the example env files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Required server env vars (`server/.env`):**

```bash
DATABASE_URL=          # PostgreSQL pooler URL (port 6543)
DIRECT_URL=            # PostgreSQL direct URL (port 5432)
SESSION_SECRET=        # 32+ character random string
OPENAI_API_KEY=        # Claude API key via OpenAI-compatible SDK
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=   # e.g. http://localhost:3000/api/auth/google/callback
CLIENT_URL=            # e.g. http://localhost:5173
NODE_ENV=development
PORT=3000
```

### Development

```bash
# Start both client (port 5173) and server (port 3000)
npm run dev

# Run only the server
npm run dev:server

# Run only the client
npm run dev:client

# Build both packages
npm run build

# Database
npm run db:migrate     # prisma migrate dev
npm run db:studio      # open Prisma Studio
```

## Architecture

This is an NPM workspaces monorepo with two packages: `client/` and `server/`.

```
resume-app/
├── client/               # Vite + React + TypeScript (port 5173)
│   └── src/
│       ├── api/          # Axios wrappers per domain
│       ├── components/   # UI primitives + layout
│       ├── context/      # AuthContext
│       ├── pages/        # Route-level components
│       ├── store/        # Zustand store
│       └── types/        # Shared TypeScript interfaces
└── server/               # Express + TypeScript (port 3000)
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── config/       # env, passport, prisma singleton
        ├── middleware/   # requireAuth, validateBody, errorHandler
        ├── routes/       # auth, profile, resumes, jobs, ai
        └── services/     # claude.ts, pdf.ts, templates.ts
```

### Key Data Flows

**Resume creation:** Profile data → snapshot into `Resume.contentJson` + `templateId` → rendered to HTML via template function → Puppeteer → PDF.

**AI tailoring:** Creates a **clone** of the source resume with rewritten `contentJson` (sets `tailoredFor` on the clone). The original resume is never mutated.

**Cover letter generation:** SSE stream from `POST /api/ai/cover-letter` — client reads chunks incrementally, saves the final text to the job record.

**Job statuses:** Fully user-defined via `UserJobStatus` table. Kanban columns are driven by these custom labels.

**AI amendment tracking:** Each AI action (resume tailor or cover letter) per job is recorded in `AiAmendment`. Max 3 amendments per job — enforced on both server (HTTP 403) and client (buttons disabled).

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current session user |
| GET | `/api/auth/google` | Start Google OAuth flow |
| POST | `/api/auth/logout` | End session |
| GET/POST/PUT | `/api/profile` | Profile CRUD |
| GET/POST | `/api/resumes` | List / create resumes |
| GET/PUT/DELETE | `/api/resumes/:id` | Single resume |
| GET | `/api/resumes/:id/pdf` | Stream PDF |
| GET/POST | `/api/jobs` | List / create job applications |
| GET/PUT/DELETE | `/api/jobs/:id` | Single job (includes amendment history) |
| PUT | `/api/jobs/:id/resume` | Link resume to job |
| POST | `/api/ai/tailor` | Tailor resume for a job (rate limited) |
| POST | `/api/ai/cover-letter` | Generate cover letter via SSE (rate limited) |
| POST | `/api/ai/improve-summary` | Improve profile summary (rate limited) |

AI routes are rate limited to **10 requests per 15 minutes per user**.

## Hosting & Deployment

The app splits hosting across three free services. Vercel rewrites proxy `/api/*` to Railway, keeping the split invisible to the frontend.

```
Browser → Vercel (static frontend)
               ↓ /api/* rewrite
          Railway (Express backend)
               ↓
          Supabase (PostgreSQL)
```

Puppeteer cannot run on Vercel's serverless runtime (size + timeout limits), which is why the backend runs on Railway.

### Deploy to Railway (Backend)

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Set **Root Directory** to `server` — Railway detects the Dockerfile automatically
3. Add all required env vars (see above), plus:
   ```
   NODE_ENV=production
   GOOGLE_CALLBACK_URL=https://YOUR_RAILWAY_URL/api/auth/google/callback
   CLIENT_URL=https://YOUR_VERCEL_URL
   PORT=3000
   ```

### Deploy to Vercel (Frontend)

1. Connect your GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `client`, Framework: **Vite**
3. Create `client/vercel.json` to proxy API calls to Railway:
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
4. Update `CLIENT_URL` in Railway to your Vercel URL

### Google OAuth

Add your Railway URL as an authorized callback in Google Cloud Console:
```
https://YOUR_RAILWAY_URL/api/auth/google/callback
```

### CI/CD

Both platforms auto-deploy on push to `main` — no GitHub Actions required.

```
git push origin main
       ↓
  GitHub repo
  ├── Vercel → builds client → deploys static
  └── Railway → builds Docker image → deploys server
```

### Free Tier Limits

| Service | Limit |
|---------|-------|
| Vercel Hobby | 100 GB bandwidth/mo, unlimited deploys |
| Railway | $5 free credit/mo (~500 hrs of a 512 MB instance) |
| Supabase Free | 500 MB DB storage, 2 GB bandwidth |
