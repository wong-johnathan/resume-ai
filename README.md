# Resume AI

An AI-powered resume builder and job application assistant. Build resumes from a structured profile, choose from 20 professionally designed templates, export PDFs, track job applications with a status table, and use Claude AI to tailor resumes and generate cover letters for specific job postings.

## Packages

| Package | Description | README |
|---|---|---|
| `server/` | Express + TypeScript API — all `/api` routes, Prisma, AI, PDF generation | [server/README.md](./server/README.md) |
| `client/` | Main user-facing React SPA (Vite, React 18, TailwindCSS) | [client/README.md](./client/README.md) |
| `admin/` | Internal read-only admin panel (Vite, React 18) | [admin/README.md](./admin/README.md) |
| `landing/` | Static marketing site (Next.js, Framer Motion) | [landing/README.md](./landing/README.md) |

## Features

### Profile & Onboarding
- **Profile builder** — structured input for work experience, education, skills (with proficiency levels), and certifications
- **PDF resume import** — upload an existing resume PDF to auto-populate your profile (name, contact info, experiences, education, skills, certifications)
- **Rich text editing** — TipTap editor for summaries and experience descriptions

### Resume Builder
- **20 resume templates** — Modern, Classic, Minimal, Executive, Slate, Teal, Elegant, Creative, Tech, Gradient, Timeline, Compact, Academic, Coral, Navy, Clean Pro, Soft, Forest, Monochrome, Sunrise
- **Live preview editor** — two-panel layout with form editor and debounced live preview
- **PDF export** — Puppeteer-generated A4 PDFs with proper page breaks and multi-page support
- **Resume status tracking** — Draft, Final, Archived
- **Resume cloning for tailoring** — original resumes are never mutated; AI creates a separate tailored clone

### AI Features (Claude)
- **AI resume tailoring** — rewrites summary, experience bullets, and reorders skills to match a job description; max 1 per job posting
- **AI cover letter generation** — real-time SSE streaming in your choice of tone (Professional, Conversational, Enthusiastic)
- **AI summary improvement** — refine your profile summary for a target role
- **Amendment history** — every AI action per job is logged with timestamps and expandable details

### Job Tracker
- **Job table** — view and manage all job applications in a table with inline status changes
- **Custom job statuses** — create, rename, recolor, reorder, and delete statuses (defaults: Saved, Applied, Phone Screen, Interview, Offer, Rejected, Withdrawn)
- **Per-job details** — company, title, URL, job description, location, salary, notes, linked resume, cover letter
- **Resume linking** — attach any resume to a job application

### Auth & Security
- **Google OAuth** — primary sign-in method
- **GitHub OAuth** — scaffolded and configurable
- **Session management** — PostgreSQL-backed sessions with 7-day lifetime
- **Rate limiting** — AI routes limited to 10 requests per 15 minutes per user

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, React Router v7 |
| State | Zustand (UI), React Hook Form + Zod (forms), React Query |
| Rich Text | TipTap editor |
| Backend | Express + TypeScript, Passport.js (Google OAuth) |
| Database | PostgreSQL + Prisma 5 |
| AI | Claude via OpenAI-compatible SDK (`OPENAI_API_KEY`) |
| PDF | Puppeteer + headless Chromium |
| Hosting | Vercel (frontend) + Railway (backend) + Supabase (database) |
| Admin panel | React 18 + TypeScript, Vite, TanStack Query |
| Landing page | Next.js App Router, React 19, Framer Motion |

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
# Start all services (server, client, admin, landing)
npm run dev

# Run only the server
npm run dev:server

# Run only the client
npm run dev:client

# Run only the admin panel
npm run dev:admin

# Run only the landing page
npm run dev:landing

# Build both packages
npm run build

# Database
npm run db:migrate     # prisma migrate dev
npm run db:studio      # open Prisma Studio
```

## Architecture

This is an NPM workspaces monorepo with four packages: `server/`, `client/`, `admin/`, and `landing/`.

```
resume-app/
├── server/               # Express + TypeScript API (port 3000)
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/       # env, passport, prisma singleton
│       ├── middleware/   # requireAuth, validateBody, errorHandler
│       ├── routes/       # auth, profile, resumes, jobs, ai, templates, admin/
│       └── services/     # claude.ts, pdf.ts, templates.ts
├── client/               # Main React SPA (port 5173)
│   └── src/
│       ├── api/          # Axios wrappers per domain
│       ├── components/   # UI primitives + layout + jobs + tours
│       ├── context/      # AuthContext, TourContext
│       ├── pages/        # Route-level components
│       ├── store/        # Zustand store
│       └── tours/        # Onboarding tour configs
├── admin/                # Internal admin panel (port 5174)
│   └── src/
│       ├── api/          # Admin API wrappers
│       ├── context/      # AdminAuthContext
│       └── pages/        # Dashboard, Users, Logs, Resumes
└── landing/              # Static marketing site (port 3001)
    ├── app/              # Next.js App Router
    └── components/       # Section components
```

### Key Data Flows

**Resume creation:** Profile data → snapshot into `Resume.contentJson` + `templateId` → rendered to HTML via template function → Puppeteer → PDF.

**AI tailoring:** Creates a **clone** of the source resume with rewritten `contentJson` (sets `tailoredFor` on the clone). The original resume is never mutated.

**Cover letter generation:** SSE stream from `POST /api/ai/cover-letter` — client reads chunks incrementally, saves the final text to the job record.

**Job statuses:** Fully user-defined via `UserJobStatus` table. Status options in the job table are driven by these custom labels.

**AI amendment tracking:** Each AI action (resume tailor or cover letter) per job is recorded in `AiAmendment`. Max 1 amendment per job — enforced on both server (HTTP 403) and client (buttons disabled).

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current session user |
| GET | `/api/auth/google` | Start Google OAuth flow |
| POST | `/api/auth/logout` | End session |
| DELETE | `/api/auth/account` | Delete account and all data |
| GET/POST/PUT | `/api/profile` | Profile CRUD |
| POST | `/api/profile/parse-pdf` | Parse PDF resume into structured data |
| CRUD | `/api/profile/experiences/:id` | Work experience entries |
| CRUD | `/api/profile/educations/:id` | Education entries |
| CRUD | `/api/profile/skills/:id` | Skills |
| CRUD | `/api/profile/certifications/:id` | Certifications |
| GET/POST | `/api/resumes` | List / create resumes |
| GET/PUT/DELETE | `/api/resumes/:id` | Single resume |
| GET | `/api/resumes/:id/preview` | Resume HTML preview |
| POST | `/api/resumes/:id/render` | Render custom contentJson to HTML |
| GET | `/api/resumes/:id/pdf` | Download PDF |
| GET/POST | `/api/jobs` | List / create job applications |
| GET/PUT/DELETE | `/api/jobs/:id` | Single job (includes amendment history) |
| PUT | `/api/jobs/:id/resume` | Link/unlink resume to job |
| GET/POST | `/api/job-statuses` | List / create job statuses |
| PUT/DELETE | `/api/job-statuses/:id` | Update / delete status |
| POST | `/api/job-statuses/reorder` | Bulk reorder statuses |
| GET | `/api/templates/:id/preview` | Preview template with profile data |
| POST | `/api/ai/tailor` | Tailor resume for a job (rate limited) |
| POST | `/api/ai/cover-letter` | Generate cover letter via SSE (rate limited) |
| POST | `/api/ai/improve-summary` | Improve profile summary (rate limited) |

AI routes are rate limited to **10 requests per 15 minutes per user**.

## Hosting & Deployment

The app splits hosting across three services. Vercel rewrites proxy `/api/*` to Railway, keeping the split invisible to the frontend.

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

### Deploy to Vercel (Landing Page)

The landing page is a separate static site, also deployed to Vercel:

1. Connect your GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `landing`, Framework: **Next.js**
3. No environment variables required — it's fully static
4. The `output: 'export'` config in `next.config.ts` produces a static export, which Vercel deploys automatically

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
