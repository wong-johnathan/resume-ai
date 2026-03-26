# Server CLAUDE.md

Express + TypeScript API server. All routes are mounted under `/api`.

## Commands

```bash
npm run dev:server        # Start server with nodemon (port 3000)
npm run build             # Compile TypeScript to dist/
npm run db:migrate        # prisma migrate dev
npm run db:studio         # Open Prisma Studio
```

No test suite.

## Entry Points

- `src/index.ts` — Runs `prisma db push` to sync schema, then starts Express on port 3000
- `src/app.ts` — Registers all middleware and routes; exports the Express app

## Directory Structure

```
server/
├── src/
│   ├── config/
│   │   ├── env.ts           # Zod-validated env vars — import from here, never process.env directly
│   │   ├── passport.ts      # Google + GitHub OAuth strategy config
│   │   └── prisma.ts        # Singleton Prisma client instance
│   ├── middleware/
│   │   ├── requireAuth.ts       # Checks session user; 401 if unauthenticated
│   │   ├── requireAdmin.ts      # Checks admin session; 401 if not admin
│   │   ├── validateBody.ts      # Wraps Zod schema; 400 with errors if invalid
│   │   ├── errorHandler.ts      # Global Express error handler
│   │   └── updateLastActive.ts  # Throttled to once per hour via in-memory map
│   ├── routes/
│   │   ├── auth.ts          # GET/POST auth: Google OAuth, GitHub OAuth, dev login, logout, /me
│   │   ├── profile.ts       # CRUD for Profile + nested Experience/Education/Skills/Certifications; PDF parse
│   │   ├── resumes.ts       # CRUD resumes, PDF download (Puppeteer), template selection, status update
│   │   ├── jobs.ts          # CRUD job applications, cover letter save
│   │   ├── jobStatuses.ts   # CRUD user-defined job status labels
│   │   ├── ai.ts            # AI routes: tailor resume, cover letter (SSE), interview prep, summary, sample jobs
│   │   ├── templates.ts     # GET /api/templates — list 20 resume templates
│   │   ├── interviewPrep.ts # Generate prep, get prep, submit answer, get feedback, generate sample response
│   │   ├── tours.ts         # PATCH /api/tours/:tourId — mark onboarding tour complete
│   │   └── admin/
│   │       ├── index.ts     # Admin router aggregator
│   │       ├── auth.ts      # Admin OAuth (separate session: admin.sid)
│   │       ├── stats.ts     # GET /api/admin/stats — aggregate counts
│   │       ├── users.ts     # GET /api/admin/users, /api/admin/users/:id
│   │       ├── resumes.ts   # GET /api/admin/resumes
│   │       └── logs.ts      # GET /api/admin/logs — ActivityLog viewer
│   ├── services/
│   │   ├── claude.ts        # AI functions — uses OpenAI SDK pointed at Claude via OPENAI_API_KEY
│   │   ├── templates.ts     # 20 HTML resume template render functions
│   │   ├── pdf.ts           # Puppeteer: render HTML template → PDF Buffer
│   │   └── activityLog.ts   # Write to ActivityLog table
│   ├── types/
│   │   └── express.d.ts     # Augments Express Request with req.user typing
│   └── utils/
│       └── profileToContent.ts  # Converts Profile DB row → resume contentJson shape
├── prisma/
│   ├── schema.prisma        # Source of truth for DB schema
│   └── migrations/          # Migration history (committed)
├── scripts/
│   └── migrate-if-changed.sh  # CI helper: runs migration only if schema changed
├── nodemon.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## Database (Prisma + PostgreSQL)

Schema at `prisma/schema.prisma`. Two connection URLs:
- `DATABASE_URL` — pooled (port 6543) for all runtime queries
- `DIRECT_URL` — direct (port 5432) for migrations only

**Models:**

| Model | Purpose |
|---|---|
| `User` | OAuth user (Google/GitHub). Fields: email, displayName, avatarUrl, provider, providerId |
| `AdminUser` | Separate admin identity for admin panel |
| `Profile` | User's resume profile (name, contact, summary, toursCompleted JSON, sampleJobsGenerated counter) |
| `Experience` | Work history entries (ordered) |
| `Education` | Education entries (ordered) |
| `Skill` | Skills with `SkillLevel` enum: BEGINNER/INTERMEDIATE/ADVANCED/EXPERT |
| `Certification` | Certifications with credentialUrl |
| `Resume` | Snapshot of resume content (contentJson, templateId, status: DRAFT/FINAL/ARCHIVED, tailoredFor) |
| `JobApplication` | Job tracking (company, title, url, description, status, notes, salary, location, fitAnalysis) |
| `JobOutput` | AI-generated content per job (resumeJson, coverLetterText, tailorChanges, versions) |
| `JobStatusHistory` | Audit trail of status changes |
| `UserJobStatus` | User-defined status labels (label, color, order) |
| `InterviewPrep` | AI-generated interview categories + Q&A per job (stored as JSON) |
| `ActivityLog` | User action audit log (action enum, metadata JSON); indexed on (userId, createdAt DESC) |

## Auth

Two completely separate auth systems:

**User auth** (`connect.sid` session):
- Passport.js Google OAuth (active) + GitHub OAuth (scaffolded)
- Session stored in PostgreSQL via `connect-pg-simple`
- Protected by `requireAuth` middleware

**Admin auth** (`admin.sid` session):
- Same OAuth providers but separate session secret and session table key
- Protected by `requireAdmin` middleware
- Routes under `/api/admin/*`

## Validation Pattern

All route bodies use Zod schemas passed to `validateBody` middleware:

```typescript
router.post('/route', requireAuth, validateBody(myZodSchema), async (req, res) => {
  const data = req.body; // already validated and typed
});
```

## AI Service (`src/services/claude.ts`)

Despite the filename, uses the **OpenAI SDK** pointed at Claude models via `OPENAI_API_KEY`. Three features:

| Feature | Method | Notes |
|---|---|---|
| Resume tailoring | `tailorResume()` | Regular async call; clones resume, rewrites contentJson |
| Cover letter | `generateCoverLetter()` | **SSE streaming** with tone: Professional/Conversational/Enthusiastic |
| Interview prep | `generateInterviewPrep()` | Returns categories + questions as JSON |
| Summary improvement | `improveSummary()` | Regular async call |
| Sample jobs | `generateSampleJob()` | Regular async call |

**Rate limit:** 10 requests per 15 minutes per user (enforced in `src/routes/ai.ts`).

## PDF Generation

Flow: `templates.ts` renders `contentJson` → HTML string → `pdf.ts` loads HTML in Puppeteer → returns PDF Buffer → sent as `application/pdf` response.

## Key Conventions

- Import env vars from `src/config/env.ts` (Zod-validated), never from `process.env` directly
- Import Prisma client from `src/config/prisma.ts` singleton
- AI tailoring **clones** the source resume — never mutate the original
- Resume tailoring per job is limited to 1 attempt (HTTP 403 if exceeded)
- `activityLog.ts` service should be called for significant user actions
- Admin routes always go under `src/routes/admin/`

## Environment Variables

Copy `server/.env.example` → `server/.env`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL URL (port 6543) |
| `DIRECT_URL` | Direct PostgreSQL URL (port 5432) — migrations only |
| `SESSION_SECRET` | 32+ char secret for user sessions |
| `ADMIN_SESSION_SECRET` | 32+ char secret for admin sessions |
| `OPENAI_API_KEY` | Claude models via OpenAI-compatible endpoint |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback (e.g. `http://localhost:3000/api/auth/google/callback`) |
| `CLIENT_URL` | Frontend origin for CORS (default: `http://localhost:5173`) |
| `ADMIN_URL` | Admin frontend origin for CORS (default: `http://localhost:5174`) |
