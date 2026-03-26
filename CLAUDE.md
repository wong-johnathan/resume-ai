# CLAUDE.md

AI-powered job application and resume management platform. NPM workspaces monorepo with four packages.

> Each sub-app has its own `CLAUDE.md` with detailed guidance:
> - [`server/CLAUDE.md`](./server/CLAUDE.md) — Express API
> - [`client/CLAUDE.md`](./client/CLAUDE.md) — Main React SPA
> - [`admin/CLAUDE.md`](./admin/CLAUDE.md) — Admin panel
> - [`landing/CLAUDE.md`](./landing/CLAUDE.md) — Marketing site (Next.js)

## Development Commands

```bash
# Start all services (server + client + admin + landing)
npm run dev

# Start individual services
npm run dev:server        # Express API (port 3000)
npm run dev:client        # Main app (port 5173)
npm run dev:admin         # Admin panel (port 5174)
npm run dev:landing       # Landing page (port 3001)

# Build (server + client only)
npm run build

# Database
npm run db:migrate        # prisma migrate dev
npm run db:studio         # Open Prisma Studio
```

No test suite.

## Monorepo Structure

```
resume-app/
├── server/        # Express + Prisma API — all /api routes
├── client/        # Main React SPA — user-facing app
├── admin/         # React admin panel — internal tooling
├── landing/       # Next.js static marketing site
├── prisma/        # Shared DB schema (lives inside server/)
├── CLAUDE.md      # This file
├── SPEC.md
├── CICD-SPEC.md
├── docker-compose.yml
├── docker-compose.dev.yml
└── railway.toml
```

**NPM workspaces:** `client`, `server`, `admin` (landing is not in workspaces — separate npm).

## Architecture Overview

### Server (`server/`) — Port 3000
Express + TypeScript + Prisma 5 + PostgreSQL. All API routes under `/api`. See [`server/CLAUDE.md`](./server/CLAUDE.md).

### Client (`client/`) — Port 5173
Vite + React 18 + TypeScript + React Router v7 + TanStack Query + Zustand + TailwindCSS. Proxies `/api` to server. See [`client/CLAUDE.md`](./client/CLAUDE.md).

### Admin (`admin/`) — Port 5174
Vite + React 18 + TypeScript. Separate admin auth session. Read-only data panel. Proxies `/api` to server. See [`admin/CLAUDE.md`](./admin/CLAUDE.md).

### Landing (`landing/`) — Port 3001
Next.js App Router + React 19 + Framer Motion. Static export deployed to Vercel. No API calls. See [`landing/CLAUDE.md`](./landing/CLAUDE.md).

## Key Data Flows

**Resume creation:** Profile data → snapshot into `Resume.contentJson` + `templateId` → rendered to HTML via template function → Puppeteer → PDF.

**AI tailoring:** Job description + resume → AI creates a **clone** of the source resume with rewritten `contentJson`. The original is never mutated. Limited to 1 tailoring per job.

**Cover letter:** SSE stream from `POST /api/ai/cover-letter` — client reads chunks and updates state incrementally, saves final text to the job record. Tone options: Professional / Conversational / Enthusiastic.

**Job statuses:** Fully user-defined via `UserJobStatus` table. Labels appear as dropdown options per row in the job tracker.

**Interview prep:** `POST /api/interview-prep/:jobId/generate` generates AI categories + questions. Each question can have one AI sample response. Users can submit answers for AI feedback (strengths, improvements, revised sample).

**Tours:** Onboarding tours tracked per-user in `Profile.toursCompleted` (JSON map of tourId → timestamp). Tour IDs: `jobs-list`, `job-detail`, `job-prep`.

## Database

Prisma 5 + PostgreSQL. Schema at `server/prisma/schema.prisma`.

Two connection URLs:
- `DATABASE_URL` — pooled (port 6543) for all runtime queries
- `DIRECT_URL` — direct (port 5432) for migrations only

Key models: `User`, `AdminUser`, `Profile`, `Experience`, `Education`, `Skill`, `Certification`, `Resume`, `JobApplication`, `JobOutput`, `UserJobStatus`, `JobStatusHistory`, `InterviewPrep`, `ActivityLog`.

## Auth

**User auth** (`connect.sid`): Passport.js Google OAuth. Sessions in PostgreSQL. Protects all `/api/*` routes via `requireAuth` middleware.

**Admin auth** (`admin.sid`): Separate session, secret, and middleware (`requireAdmin`). Protects all `/api/admin/*` routes.

## AI Integration

All AI features use the **OpenAI SDK pointed at Claude models** via `OPENAI_API_KEY` (OpenAI-compatible endpoint). The service file is `server/src/services/claude.ts`.

Features: resume tailoring, cover letter generation (SSE), interview prep Q&A, summary improvement, sample job generation.

Rate limit: 10 requests per 15 minutes per user.

## Environment Setup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Required server env vars:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL (port 6543) |
| `DIRECT_URL` | Direct PostgreSQL (port 5432) |
| `SESSION_SECRET` | 32+ char secret for user sessions |
| `ADMIN_SESSION_SECRET` | 32+ char secret for admin sessions |
| `OPENAI_API_KEY` | Claude models via OpenAI-compatible SDK |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_CALLBACK_URL` | e.g. `http://localhost:3000/api/auth/google/callback` |
| `CLIENT_URL` | Frontend CORS origin (default: `http://localhost:5173`) |
| `ADMIN_URL` | Admin CORS origin (default: `http://localhost:5174`) |
