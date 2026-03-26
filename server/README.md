# Server

Express + TypeScript API server for Resume AI. Handles all `/api` routes — auth, profile, resumes, job tracking, AI features (resume tailoring, cover letter generation, interview prep), and PDF generation.

> Part of the [resume-app](../README.md) monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+, Express + TypeScript |
| Database | PostgreSQL + Prisma 5 |
| Auth | Passport.js (Google OAuth + GitHub OAuth), connect-pg-simple sessions |
| AI | OpenAI SDK → Claude models via `OPENAI_API_KEY` |
| PDF | Puppeteer (headless Chromium) |
| Validation | Zod via `validateBody` middleware |
| Rate limiting | express-rate-limit (10 req / 15 min per user for AI routes) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Google OAuth credentials
- Claude API key (via OpenAI-compatible endpoint)

### Environment Setup

```bash
cp server/.env.example server/.env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled PostgreSQL URL (port 6543) |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL (port 5432) — migrations only |
| `SESSION_SECRET` | Yes | 32+ char random string for user sessions |
| `ADMIN_SESSION_SECRET` | Yes | 32+ char random string for admin sessions |
| `OPENAI_API_KEY` | Yes | Claude API key via OpenAI-compatible SDK |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | e.g. `http://localhost:3000/api/auth/google/callback` |
| `CLIENT_URL` | Yes | Frontend CORS origin (default: `http://localhost:5173`) |
| `ADMIN_URL` | No | Admin CORS origin (default: `http://localhost:5174`) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |

### Run

```bash
# From the repo root
npm run dev:server

# Or from server/
npm run dev
```

Server starts on port 3000. On startup, runs `prisma db push` to sync the schema.

## Architecture

```
server/src/
├── index.ts              # Entry: db push → start Express
├── app.ts                # Register middleware + routes under /api
├── config/
│   ├── env.ts            # Zod-validated env vars — always import from here
│   ├── passport.ts       # Google + GitHub OAuth strategies
│   └── prisma.ts         # Singleton Prisma client
├── middleware/
│   ├── requireAuth.ts    # 401 if no user session
│   ├── requireAdmin.ts   # 401 if no admin session
│   ├── validateBody.ts   # Zod schema validation; 400 on failure
│   ├── errorHandler.ts   # Global Express error handler
│   └── updateLastActive.ts  # Throttled last-active timestamp (1/hr)
├── routes/
│   ├── auth.ts           # OAuth + session routes
│   ├── profile.ts        # Profile CRUD + PDF import
│   ├── resumes.ts        # Resume CRUD + PDF generation
│   ├── jobs.ts           # Job application CRUD
│   ├── jobStatuses.ts    # Custom status label CRUD
│   ├── ai.ts             # AI routes (rate limited)
│   ├── templates.ts      # Template listing
│   ├── interviewPrep.ts  # Interview prep generation + Q&A
│   ├── tours.ts          # Onboarding tour completion
│   └── admin/            # Admin-only routes (requireAdmin)
│       ├── auth.ts
│       ├── stats.ts
│       ├── users.ts
│       ├── resumes.ts
│       └── logs.ts
├── services/
│   ├── claude.ts         # AI functions (OpenAI SDK → Claude)
│   ├── templates.ts      # 20 HTML resume template renderers
│   ├── pdf.ts            # Puppeteer → PDF Buffer
│   └── activityLog.ts    # Write to ActivityLog table
└── utils/
    └── profileToContent.ts  # Profile DB row → resume contentJson
```

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/me` | — | Current session user |
| GET | `/api/auth/google` | — | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | — | Google OAuth callback |
| POST | `/api/auth/logout` | User | End session |
| DELETE | `/api/auth/account` | User | Delete account and all data |

### Profile

| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` | Get current user's profile |
| POST | `/api/profile` | Create profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/parse-pdf` | Parse uploaded PDF → structured profile data |
| POST/PUT/DELETE | `/api/profile/experiences/:id` | Work experience CRUD |
| POST/PUT/DELETE | `/api/profile/educations/:id` | Education CRUD |
| POST/PUT/DELETE | `/api/profile/skills/:id` | Skills CRUD |
| POST/PUT/DELETE | `/api/profile/certifications/:id` | Certifications CRUD |

### Resumes

| Method | Path | Description |
|---|---|---|
| GET | `/api/resumes` | List user's resumes |
| POST | `/api/resumes` | Create resume (snapshot from profile) |
| GET | `/api/resumes/:id` | Get single resume |
| PUT | `/api/resumes/:id` | Update resume |
| DELETE | `/api/resumes/:id` | Delete resume |
| GET | `/api/resumes/:id/pdf` | Download PDF |
| GET | `/api/resumes/:id/preview` | Get HTML preview |
| POST | `/api/resumes/:id/render` | Render custom contentJson to HTML |

### Jobs

| Method | Path | Description |
|---|---|---|
| GET | `/api/jobs` | List job applications |
| POST | `/api/jobs` | Create job application |
| GET | `/api/jobs/:id` | Get job (includes amendment history) |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| PUT | `/api/jobs/:id/resume` | Link/unlink resume to job |

### Job Statuses

| Method | Path | Description |
|---|---|---|
| GET | `/api/job-statuses` | List custom statuses |
| POST | `/api/job-statuses` | Create status |
| PUT | `/api/job-statuses/:id` | Update status |
| DELETE | `/api/job-statuses/:id` | Delete status |
| POST | `/api/job-statuses/reorder` | Bulk reorder |

### AI (rate limited: 10 req / 15 min per user)

| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/tailor` | Tailor resume for a job — clones the source resume |
| POST | `/api/ai/cover-letter` | Generate cover letter — **SSE streaming** |
| POST | `/api/ai/improve-summary` | Improve profile summary |
| POST | `/api/ai/sample-job` | Generate a sample job posting from profile |

### Templates

| Method | Path | Description |
|---|---|---|
| GET | `/api/templates` | List all 20 templates |
| GET | `/api/templates/:id/preview` | Preview template with user's profile data |

### Interview Prep

| Method | Path | Description |
|---|---|---|
| POST | `/api/interview-prep/:jobId/generate` | Generate categories + questions |
| GET | `/api/interview-prep/:jobId` | Get existing prep for a job |
| POST | `/api/interview-prep/:jobId/answer` | Submit answer for feedback |
| POST | `/api/interview-prep/:jobId/sample-response` | Generate AI sample response |

### Tours

| Method | Path | Description |
|---|---|---|
| PATCH | `/api/tours/:tourId` | Mark onboarding tour complete |

Tour IDs: `jobs-list`, `job-detail`, `job-prep`

### Admin (requires admin session)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/auth/me` | Current admin session |
| GET | `/api/admin/auth/google` | Admin Google OAuth |
| GET | `/api/admin/stats` | Aggregate counts |
| GET | `/api/admin/users` | Paginated user list |
| GET | `/api/admin/users/:id` | User detail |
| GET | `/api/admin/resumes` | Resume list |
| GET | `/api/admin/logs` | Activity log |

## Database

Prisma 5 + PostgreSQL. Schema at `prisma/schema.prisma`.

**Two connection URLs are required:**
- `DATABASE_URL` — pooled connection (port 6543) used for all runtime queries
- `DIRECT_URL` — direct connection (port 5432) used for migrations only

**Key models:**

| Model | Purpose |
|---|---|
| `User` | OAuth user identity |
| `AdminUser` | Admin panel identity (separate from User) |
| `Profile` | Resume profile data (name, contact, summary, toursCompleted) |
| `Experience` / `Education` / `Skill` / `Certification` | Profile sub-records |
| `Resume` | Snapshot of profile → contentJson + templateId + status (DRAFT/FINAL/ARCHIVED) |
| `JobApplication` | Job tracking record |
| `JobOutput` | AI-generated resume + cover letter per job |
| `UserJobStatus` | User-defined status labels |
| `InterviewPrep` | AI-generated interview Q&A per job |
| `ActivityLog` | Audit log of user actions |

## Auth

Two completely separate session systems share the same Express server:

**User sessions** (`connect.sid`):
- Passport.js Google OAuth (GitHub scaffolded)
- Session secret: `SESSION_SECRET`
- Protected by `requireAuth` middleware
- Applied to all `/api/*` routes except auth and admin

**Admin sessions** (`admin.sid`):
- Same OAuth providers, different session
- Session secret: `ADMIN_SESSION_SECRET`
- Protected by `requireAdmin` middleware
- Applied to all `/api/admin/*` routes

## AI Service

`src/services/claude.ts` uses the **OpenAI SDK pointed at Claude models** via `OPENAI_API_KEY`. Despite the filename, no Anthropic SDK is used.

| Feature | Streaming | Notes |
|---|---|---|
| Resume tailoring | No | Clones source resume; original never mutated. Limited to 1 per job. |
| Cover letter | **Yes (SSE)** | Tone options: Professional / Conversational / Enthusiastic |
| Summary improvement | No | Rewrites profile summary for a target role |
| Interview prep | No | Returns categories + questions as structured JSON |
| Sample job | No | Generates a job posting from user's profile |

Rate limit: **10 requests per 15 minutes per user** (enforced in `src/routes/ai.ts`).
