# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start both client and server in dev mode
npm run dev

# Run only server (port 3000)
npm run dev:server

# Run only client (port 5173)
npm run dev:client

# Build both
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
- **Auth:** Passport.js with Google OAuth (active), GitHub/LinkedIn (scaffolded). Sessions stored in PostgreSQL via `connect-pg-simple`.
- **AI:** `src/services/claude.ts` — despite the filename, uses the OpenAI SDK pointed at Claude models via `OPENAI_API_KEY`. Cover letter generation is SSE streaming; resume tailoring and summary improvement are regular async calls.
- **PDF generation:** `src/services/templates.ts` renders resume templates to HTML, then Puppeteer generates PDFs.
- **Validation pattern:** Zod schemas on request bodies via `validateBody` middleware. Auth protected via `requireAuth` middleware.
- **Rate limiting:** AI routes are limited to 10 req/15 min per user.

### Client (`client/`)

- **Build:** Vite + React 18 + TypeScript. Dev server proxies `/api` → `http://localhost:3000`.
- **Routing:** React Router v7. Routes split into public (`/`, `/login`) and protected (everything else under `<ProtectedRoute>` + `<ProfileGate>`). `ProfileGate` redirects to `/setup` if user has no profile.
- **Auth state:** `AuthContext` fetches `/api/auth/me` on mount; provides `user` and `loading` via `useAuth()`.
- **UI state:** Zustand store (`src/store/useAppStore.ts`) handles sidebar open/close and toast notifications.
- **API calls:** Axios instance in `src/api/api.ts` with `baseURL=/api` and `withCredentials: true`. Wrapper functions per domain in `src/api/` (jobs, resumes, profile, ai, jobStatuses).
- **Forms:** React Hook Form + Zod for validation.
- **Rich text:** TipTap editor used in resume editing.
- **Drag-and-drop:** dnd-kit powers the Kanban job tracker board.

### Key Data Flows

**Resume creation:** User profile data → snapshot into `Resume.contentJson` + `templateId` → rendered to HTML via template function → Puppeteer → PDF.

**AI tailoring:** Creates a **clone** of the source resume with rewritten `contentJson` (sets `tailoredFor` field on the clone). The original resume is never mutated.

**Cover letter generation:** SSE stream from `POST /api/ai/cover-letter` — client reads the stream and updates state incrementally, saving the final text to the job record.

**Job statuses:** Fully user-defined via `UserJobStatus` table. The Kanban board columns are driven by these custom labels.

## Environment Setup

Copy `.env.example` → `.env` in both `server/` and `client/`.

Required server env vars:
- `DATABASE_URL` + `DIRECT_URL` — PostgreSQL (Supabase recommended)
- `SESSION_SECRET` — 32+ char random string
- `OPENAI_API_KEY` — used for all AI features (Claude models via OpenAI-compatible SDK)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_CALLBACK_URL`
- `CLIENT_URL` — frontend origin for CORS (default: `http://localhost:5173`)
