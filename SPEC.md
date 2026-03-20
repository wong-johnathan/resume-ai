# AI-Powered Resume Builder & Job Application Assistant

## Context
Greenfield application at `/Users/johnathanwong/Desktop/resume-app` (empty directory). The goal is a full-stack tool that lets users build resumes from a structured profile, choose templates, export PDFs, track job applications, and use Claude AI to tailor resumes and generate cover letters for specific job postings.

**Stack:** React (Vite) + TypeScript (client) · Express + TypeScript (server) · PostgreSQL + Prisma · Claude API (claude-sonnet-4-6) · Passport.js OAuth (Google, GitHub, LinkedIn)

---

## Folder Structure

```
resume-app/
├── package.json                    # npm workspaces root
├── .gitignore
├── client/                         # Vite + React + TypeScript
│   ├── package.json
│   ├── vite.config.ts              # proxy /api → localhost:3000
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # React Router root
│       ├── api/                    # axios wrappers per domain
│       ├── hooks/                  # React Query hooks
│       ├── context/AuthContext.tsx
│       ├── store/useAppStore.ts    # Zustand (UI state)
│       ├── components/
│       │   ├── ui/                 # Button, Input, Modal, Toast, etc.
│       │   ├── layout/             # AppLayout, Sidebar, ProtectedRoute
│       │   ├── profile/            # PersonalInfoForm, ExperienceForm, etc.
│       │   ├── resume/             # TemplateCard, ResumePreview, TailorModal
│       │   └── jobs/               # JobCard, JobForm, CoverLetterModal
│       └── pages/
│           ├── LandingPage.tsx
│           ├── LoginPage.tsx       # OAuth buttons
│           ├── DashboardPage.tsx
│           ├── ProfilePage.tsx
│           ├── TemplatesPage.tsx
│           ├── ResumesPage.tsx
│           ├── ResumeDetailPage.tsx
│           ├── JobTrackerPage.tsx  # Kanban board
│           └── JobDetailPage.tsx
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── index.ts
        ├── app.ts                  # middleware + route registration
        ├── config/
        │   ├── env.ts              # Zod-validated env
        │   ├── passport.ts         # OAuth strategies
        │   └── prisma.ts           # singleton PrismaClient
        ├── middleware/
        │   ├── requireAuth.ts
        │   ├── errorHandler.ts
        │   └── validateBody.ts
        ├── routes/
        │   ├── auth.ts
        │   ├── profile.ts
        │   ├── resumes.ts
        │   ├── jobs.ts
        │   └── ai.ts
        └── services/
            ├── claude.ts           # all Anthropic API calls
            ├── pdf.ts              # Puppeteer PDF generation
            └── templates.ts        # HTML/CSS template functions
```

---

## Prisma Schema (key models)

```prisma
model User { id, email, displayName, avatarUrl, provider, providerId, createdAt, updatedAt }
model Profile { id, userId(unique), firstName, lastName, email, phone, location, summary, linkedinUrl, githubUrl, portfolioUrl }
model Experience { id, profileId, company, title, startDate, endDate, isCurrent, description, order }
model Education { id, profileId, institution, degree, fieldOfStudy, startDate, endDate, gpa }
model Skill { id, profileId, name, level(enum), category }
model Certification { id, profileId, name, issuer, issueDate, credentialUrl }
model Resume { id, userId, title, templateId, status(enum), contentJson(Json), tailoredFor, coverLetter }
model JobApplication { id, userId, company, jobTitle, jobUrl, description, status(enum), resumeId, notes, appliedAt }

enum ApplicationStatus { SAVED | APPLIED | PHONE_SCREEN | INTERVIEW | OFFER | REJECTED | WITHDRAWN }
enum ResumeStatus { DRAFT | FINAL | ARCHIVED }
enum SkillLevel { BEGINNER | INTERMEDIATE | ADVANCED | EXPERT }
```

**Key design:** `Resume.contentJson` is a snapshot of the profile at creation time — tailoring rewrites this snapshot without mutating the base `Profile`.

---

## API Routes

### Auth
```
GET /api/auth/me
GET /api/auth/google  →  /api/auth/google/callback
GET /api/auth/github  →  /api/auth/github/callback
GET /api/auth/linkedin → /api/auth/linkedin/callback
POST /api/auth/logout
```

### Profile (all requireAuth)
```
GET/POST/PUT /api/profile
POST/PUT/DELETE /api/profile/experiences/:id
POST/PUT/DELETE /api/profile/educations/:id
POST/PUT/DELETE /api/profile/skills/:id
POST/PUT/DELETE /api/profile/certifications/:id
```

### Resumes (all requireAuth)
```
GET/POST       /api/resumes
GET/PUT/DELETE /api/resumes/:id
GET            /api/resumes/:id/pdf      → streams PDF buffer
```

### Jobs (all requireAuth)
```
GET/POST       /api/jobs
GET/PUT/DELETE /api/jobs/:id
PUT            /api/jobs/:id/resume      → link resume to job
```

### AI (requireAuth + rate limited: 10 req/15min/user)
```
POST /api/ai/tailor          → { resumeId, jobDescription } → updated contentJson
POST /api/ai/cover-letter    → { profileId, jobDescription, tone } → SSE stream
POST /api/ai/improve-summary → { currentSummary, targetRole } → string
```

---

## AI Strategy (claude-sonnet-4-6)

### Resume Tailoring
- Input: full `contentJson` (JSON) + job description text
- Prompt instructs Claude to rewrite summary + experience bullets using JD keywords, reorder skills by relevance — **never fabricate** skills/experience
- Output: JSON matching same `ResumeContent` schema, validated with Zod before saving
- Retry once on invalid JSON with explicit correction instruction
- `max_tokens: 3000`

### Cover Letter (streaming SSE)
- Input: profile summary, top skills, most recent experience + job description + tone (Professional/Conversational/Enthusiastic)
- Uses `anthropic.messages.stream()` → piped as Server-Sent Events
- `max_tokens: 800`

### Improve Summary
- Input: current summary + target role → returns improved 2-3 sentence summary
- `max_tokens: 200`

---

## Templates (Puppeteer PDF)

4 templates defined as TypeScript functions: `(contentJson: ResumeContent) => string` (self-contained HTML with embedded CSS)

| ID | Style |
|----|-------|
| `modern` | Two-column, colored sidebar for contact/skills |
| `classic` | Single-column, serif, traditional |
| `minimal` | Clean sans-serif, lots of whitespace |
| `executive` | Bold header, compact, dense |

PDF route: fetch Resume → `templates[templateId](contentJson)` → Puppeteer `page.pdf({ format: 'A4' })` → stream buffer

---

## Key Dependencies

**Server:** `express`, `prisma`, `@prisma/client`, `passport`, `passport-google-oauth20`, `passport-github2`, `passport-linkedin-oauth2`, `express-session`, `connect-pg-simple`, `@anthropic-ai/sdk`, `puppeteer`, `zod`, `cors`, `helmet`, `express-rate-limit`

**Client:** `react-router-dom`, `@tanstack/react-query`, `axios`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `tailwindcss`, `lucide-react`, `@dnd-kit/core` (Kanban drag-and-drop)

---

## Environment Variables

```bash
# server/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/resume_app
SESSION_SECRET=<32+ char random string>
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL
GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_CALLBACK_URL
LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET / LINKEDIN_CALLBACK_URL
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# client/.env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Implementation Order

| Phase | Focus | Key Deliverable |
|-------|-------|----------------|
| 1 | Scaffolding | Both apps boot, workspaces wired |
| 2 | Database | Prisma schema + first migration |
| 3 | Auth | OAuth login/logout, session, protected routes |
| 4 | Profile | Full CRUD for all profile sections |
| 5 | Templates + Resume | PDF export end-to-end |
| 6 | AI Features | Tailor + cover letter + improve summary |
| 7 | Job Tracker | Kanban board, drag-and-drop |
| 8 | Polish | Error handling, toasts, mobile layout, dashboard stats |

---

## Critical Files

- `server/prisma/schema.prisma` — all models; must be correct before any other server code
- `server/src/config/passport.ts` — OAuth upsert logic; incorrect here silently breaks all auth
- `server/src/services/claude.ts` — AI calls, JSON validation/retry, streaming
- `server/src/services/templates.ts` — self-contained HTML/CSS (no external font loads at Puppeteer runtime)
- `client/src/context/AuthContext.tsx` — bootstraps auth state on load; gates all protected routes

---

## Verification

1. `npm run dev` from root starts both client (`:5173`) and server (`:3000`)
2. OAuth login redirects back to `/dashboard` with session cookie set
3. Profile CRUD: fill out all sections, verify data persists in PostgreSQL
4. Resume creation: select template → verify PDF download renders correctly
5. AI tailor: paste a job description → verify `contentJson` in DB is updated with new content
6. Cover letter: verify SSE stream arrives token-by-token in browser
7. Job tracker: create job → drag card between columns → status updates in DB
