# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start server, client, and landing page in dev mode
npm run dev

# Run only server (port 3000)
npm run dev:server

# Run only client (port 5173)
npm run dev:client

# Run only landing page (port 3001)
npm run dev:landing

# Build both client and server
npm run build

# Database migrations
npm run db:migrate      # prisma migrate dev
npm run db:studio       # open Prisma Studio
```

There are no test commands — this project has no test suite.

## Architecture

This is an NPM workspaces monorepo with two packages: `client/` (React) and `server/` (Express).

### Server (`server/`)

- **Entry:** `src/index.ts` — syncs DB schema via `prisma db push`, then starts Express
- **App setup:** `src/app.ts` — registers all middleware and routes under `/api`
- **Database:** Prisma 5 + PostgreSQL. Schema at `prisma/schema.prisma`. Uses two connection URLs: `DATABASE_URL` (pooled, port 6543) for runtime, `DIRECT_URL` (direct, port 5432) for migrations.
- **Auth:** Passport.js with Google OAuth (active), GitHub (scaffolded). Sessions stored in PostgreSQL via `connect-pg-simple`.
- **AI:** `src/services/claude.ts` — despite the filename, uses the OpenAI SDK pointed at Claude models via `OPENAI_API_KEY`. Cover letter generation is SSE streaming (with tone option: Professional/Conversational/Enthusiastic); resume tailoring and summary improvement are regular async calls.
- **AI amendments:** Each AI action per job is recorded in the `AiAmendment` table. Max 3 tailoring amendments per job — enforced server-side (HTTP 403) and client-side (buttons disabled).
- **PDF generation:** `src/services/templates.ts` renders 20 resume templates to HTML; `src/services/pdf.ts` runs Puppeteer to generate PDFs.
- **PDF import:** `POST /api/profile/parse-pdf` parses an uploaded resume PDF to auto-populate profile fields.
- **Validation pattern:** Zod schemas on request bodies via `validateBody` middleware. Auth protected via `requireAuth` middleware.
- **Rate limiting:** AI routes are limited to 10 req/15 min per user.

### Client (`client/`)

- **Build:** Vite + React 18 + TypeScript. Dev server proxies `/api` → `http://localhost:3000`.
- **Routing:** React Router v7. Routes split into public (`/`, `/login`) and protected (everything else under `<ProtectedRoute>` + `<ProfileGate>`). `ProfileGate` redirects to `/setup` if user has no profile.
- **Auth state:** `AuthContext` fetches `/api/auth/me` on mount; provides `user` and `loading` via `useAuth()`.
- **UI state:** Zustand store (`src/store/useAppStore.ts`) handles sidebar open/close and toast notifications.
- **API calls:** Axios instance in `src/api/api.ts` with `baseURL=/api` and `withCredentials: true`. Wrapper functions per domain in `src/api/` (jobs, resumes, profile, ai, jobStatuses, interviewPrep, tours). React Query is used for server state.
- **Forms:** React Hook Form + Zod for validation.
- **Rich text:** TipTap editor used in resume editing.
- **Drag-and-drop:** dnd-kit is a dependency but the job tracker is a table list — status is updated via a dropdown per row.

### Key Data Flows

**Resume creation:** User profile data → snapshot into `Resume.contentJson` + `templateId` + status (Draft/Final/Archived) → rendered to HTML via template function → Puppeteer → PDF.

**AI tailoring:** Creates a **clone** of the source resume with rewritten `contentJson` (sets `tailoredFor` field on the clone). The original resume is never mutated.

**Cover letter generation:** SSE stream from `POST /api/ai/cover-letter` — client reads the stream and updates state incrementally, saving the final text to the job record.

**Job statuses:** Fully user-defined via `UserJobStatus` table. Status labels appear as dropdown options on each row of the job tracker table.

**AI amendment tracking:** Each AI action (resume tailor or cover letter) per job is recorded in `AiAmendment`. Max 3 tailoring amendments per job — enforced on server (HTTP 403) and client (buttons disabled).

**Interview prep:** `POST /api/interview-prep/:jobId/generate` generates AI interview categories and questions tailored to the job. Each question can have one AI-generated sample response (enforced server-side). Users can also submit their own answers for AI feedback (strengths, improvements, revised sample). All stored in the `InterviewPrep` table per job.

**Tours:** Onboarding tours are tracked per-user in `Profile.toursCompleted` (a JSON map of tour ID → completion timestamp). Tour IDs: `jobs-list`, `job-detail`, `job-prep`. `PATCH /api/tours/:tourId` marks a tour complete.

## Environment Setup

Copy `.env.example` → `.env` in both `server/` and `client/`.

Required server env vars:
- `DATABASE_URL` + `DIRECT_URL` — PostgreSQL (Supabase recommended)
- `SESSION_SECRET` — 32+ char random string
- `OPENAI_API_KEY` — used for all AI features (Claude models via OpenAI-compatible SDK)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_CALLBACK_URL`
- `CLIENT_URL` — frontend origin for CORS (default: `http://localhost:5173`)
