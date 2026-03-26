# README Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create README.md files for server/, client/, admin/, and landing/, and update the root README.md to reflect the full 4-package monorepo.

**Architecture:** Each README is a standalone markdown file sized to the complexity of its package. The root README acts as the hub; sub-READMEs are self-contained but link back to root for shared context. No code changes — documentation only.

**Tech Stack:** Markdown. All files written in the `feature/claude-md-docs` worktree.

---

## File Map

| Action | File |
|---|---|
| Modify | `README.md` |
| Create | `server/README.md` |
| Create | `client/README.md` |
| Create | `admin/README.md` |
| Replace | `landing/README.md` |

---

### Task 1: Update root `README.md`

**Files:**
- Modify: `README.md`

The root README currently mentions only `client/` and `server/`. It needs to reflect all 4 packages.

- [ ] **Step 1: Add a Packages section** after the opening description paragraph, before the Features section:

```markdown
## Packages

| Package | Description | README |
|---|---|---|
| `server/` | Express + TypeScript API — all `/api` routes, Prisma, AI, PDF generation | [server/README.md](./server/README.md) |
| `client/` | Main user-facing React SPA (Vite, React 18, TailwindCSS) | [client/README.md](./client/README.md) |
| `admin/` | Internal read-only admin panel (Vite, React 18) | [admin/README.md](./admin/README.md) |
| `landing/` | Static marketing site (Next.js, Framer Motion) | [landing/README.md](./landing/README.md) |
```

- [ ] **Step 2: Update the Tech Stack table** to add admin and landing rows:

Add after the existing `| Hosting | ... |` row:

```markdown
| Admin panel | React 18 + TypeScript, Vite, TanStack Query |
| Landing page | Next.js App Router, React 19, Framer Motion |
```

- [ ] **Step 3: Update the Development Commands section** to add missing commands:

Add after `npm run dev:client`:

```markdown
# Run only the admin panel
npm run dev:admin

# Run only the landing page
npm run dev:landing
```

- [ ] **Step 4: Update the Architecture section** monorepo tree to include admin and landing:

Replace:
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
        ├── routes/       # auth, profile, resumes, jobs, job-statuses, ai, templates
        └── services/     # claude.ts, pdf.ts, templates.ts
```

With:
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

- [ ] **Step 5: Update the Deployment section** to mention landing deploys separately:

Add after the existing Vercel frontend deployment instructions:

```markdown
### Deploy to Vercel (Landing Page)

The landing page is a separate static site, also deployed to Vercel:

1. Connect your GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `landing`, Framework: **Next.js**
3. No environment variables required — it's fully static
4. Vercel will run `next build` which produces a static export in `out/`
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update root README to reflect full 4-package monorepo"
```

---

### Task 2: Create `server/README.md`

**Files:**
- Create: `server/README.md`

- [ ] **Step 1: Write `server/README.md`** with the following full content:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add server/README.md
git commit -m "docs: add server README"
```

---

### Task 3: Create `client/README.md`

**Files:**
- Create: `client/README.md`

- [ ] **Step 1: Write `client/README.md`**:

```markdown
# Client

Main user-facing React SPA for Resume AI. Build and manage resumes, track job applications, use AI to tailor resumes and generate cover letters, and prepare for interviews.

> Part of the [resume-app](../README.md) monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite + TypeScript |
| UI | React 18, TailwindCSS, Lucide icons |
| Routing | React Router v7 |
| Server state | TanStack Query (React Query) |
| UI state | Zustand |
| Forms | React Hook Form + Zod |
| Rich text | TipTap editor |
| HTTP | Axios (`baseURL=/api`, `withCredentials: true`) |

## Getting Started

### Prerequisites

- Node.js 20+
- Server running on port 3000 (see [server/README.md](../server/README.md))

### Run

```bash
# From the repo root
npm run dev:client
```

Opens on [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` → `http://localhost:3000`.

No `.env` secrets required — the client has no sensitive configuration.

## Routes

| Path | Auth | Profile | Description |
|---|---|---|---|
| `/` | — | — | Login page (Google OAuth) |
| `/login` | — | — | Redirects to `/` |
| `/setup` | Required | — | Initial profile creation |
| `/dashboard` | Required | Required | Overview + quick links |
| `/profile` | Required | Required | Edit profile, experiences, education, skills |
| `/templates` | Required | Required | Browse + select resume templates |
| `/resumes/:id` | Required | Required | View resume, download PDF |
| `/resumes/:id/edit` | Required | Required | Edit resume with TipTap rich-text editor |
| `/jobs` | Required | Required | Job application table |
| `/jobs/:id` | Required | Required | Job detail: cover letter, tailor, interview prep |

**Auth guard:** `<ProtectedRoute>` redirects unauthenticated users to `/`.
**Profile guard:** `<ProfileGate>` redirects users without a profile to `/setup`.

## Architecture

```
client/src/
├── api/
│   ├── client.ts         # Axios instance — import this, never create a new one
│   ├── auth.ts           # getMe(), logout()
│   ├── profile.ts        # Profile + experiences/education/skills/certifications
│   ├── resumes.ts        # Resume CRUD, PDF download
│   ├── jobs.ts           # Job application CRUD
│   ├── jobStatuses.ts    # Custom status CRUD
│   ├── ai.ts             # tailorResume(), streamCoverLetter(), improveSummary()
│   ├── templates.ts      # listTemplates(), getPreview()
│   ├── interviewPrep.ts  # generatePrep(), submitAnswer(), getAnswerFeedback()
│   └── tours.ts          # markTourComplete(tourId)
├── context/
│   ├── AuthContext.tsx   # Fetches /api/auth/me on mount; useAuth() → { user, loading }
│   └── TourContext.tsx   # Tour state + completion logic
├── hooks/
│   ├── useProfile.ts     # React Query hook for user profile
│   └── useTour.ts        # Wrapper around TourContext
├── store/
│   └── useAppStore.ts    # Zustand: sidebarOpen + toasts
├── types/
│   ├── index.ts          # All shared TypeScript types
│   └── resumeContent.ts  # Resume.contentJson type definition
├── pages/
│   ├── LoginPage.tsx
│   ├── SetupPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── TemplatesPage.tsx
│   ├── ResumeDetailPage.tsx
│   ├── ResumeEditPage.tsx
│   ├── JobTrackerPage.tsx
│   └── JobDetailPage.tsx
├── components/
│   ├── layout/           # AppLayout, Sidebar, ProtectedRoute, ProfileGate
│   ├── jobs/             # Cover letter, interview prep, fit score, export
│   ├── profile/          # Profile form sections
│   ├── tour/             # TourOverlay, TakeTourButton
│   └── ui/               # Button, Input, Modal, Toast, RichTextEditor, etc.
└── tours/
    ├── index.ts          # Tour registry
    ├── types.ts          # Tour step shape
    └── configs/          # jobsListTour, jobDetailTour, jobPrepTour
```

## Key Patterns

### Auth state
```typescript
import { useAuth } from '../context/AuthContext';
const { user, loading } = useAuth();
```

### Server state (React Query)
```typescript
import { useProfile } from '../hooks/useProfile';
const { data: profile, isLoading } = useProfile();
```

### UI state (Zustand)
```typescript
import { useAppStore } from '../store/useAppStore';
const { addToast } = useAppStore();
addToast({ message: 'Saved!', type: 'success' });
```

### API calls
Always call through `src/api/` wrappers — never use the Axios instance directly in components:
```typescript
import { updateProfile } from '../api/profile';
await updateProfile(data);
```

### Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ title: z.string().min(1) });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Toasts
```typescript
const { addToast } = useAppStore();
addToast({ message: 'Resume saved', type: 'success' });
addToast({ message: 'Something went wrong', type: 'error' });
```

## Tours

Three onboarding tours guide new users through the app:

| Tour ID | Page | Trigger |
|---|---|---|
| `jobs-list` | `/jobs` | First visit to job tracker |
| `job-detail` | `/jobs/:id` | First visit to a job detail page |
| `job-prep` | `/jobs/:id?tab=prep` | First visit to interview prep tab |

Completion is persisted server-side via `PATCH /api/tours/:tourId` and stored in `Profile.toursCompleted` (JSON map of tourId → ISO timestamp). Tour configs live in `src/tours/configs/`.
```

- [ ] **Step 2: Commit**

```bash
git add client/README.md
git commit -m "docs: add client README"
```

---

### Task 4: Create `admin/README.md`

**Files:**
- Create: `admin/README.md`

- [ ] **Step 1: Write `admin/README.md`**:

```markdown
# Admin

Internal read-only admin panel for Resume AI. Provides a dashboard view of users, resumes, job applications, and activity logs. Not public-facing.

> Part of the [resume-app](../README.md) monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite + TypeScript |
| UI | React 18, TailwindCSS |
| Routing | React Router v7 |
| Server state | TanStack Query (React Query) |
| HTTP | Axios (`baseURL=/api`, `withCredentials: true`) |

## Getting Started

### Prerequisites

- Server running on port 3000 (see [server/README.md](../server/README.md))
- An `AdminUser` account provisioned in the database

### Run

```bash
# From the repo root
npm run dev:admin
```

Opens on [http://localhost:5174](http://localhost:5174). No `.env` file needed — the Vite proxy routes `/api` to `http://localhost:3000`.

### Admin Access

Admin accounts use a **separate OAuth session** from regular users (`admin.sid` vs `connect.sid`). To gain admin access:

1. Log in at `/login` using Google OAuth
2. An `AdminUser` record must exist in the database for your Google account
3. Admin accounts are provisioned directly in the database — there is no self-signup

## Routes

| Path | Description |
|---|---|
| `/login` | Google/GitHub OAuth for admin (public) |
| `/dashboard` | Stats: total users, resumes, jobs, recent activity |
| `/users` | Paginated list of all users |
| `/users/:userId` | User detail: profile, resumes, job applications |
| `/users/:userId/jobs/:jobId` | Job detail: outputs, AI amendments, versions |
| `/logs` | ActivityLog table with filters |
| `/resumes` | Resume list across all users |

All routes except `/login` require an active admin session. The `AdminAuthGuard` component in `App.tsx` handles the redirect.

## Auth

The admin panel uses a **completely separate session** from the main user app:

| | User App | Admin Panel |
|---|---|---|
| Cookie name | `connect.sid` | `admin.sid` |
| Session secret | `SESSION_SECRET` | `ADMIN_SESSION_SECRET` |
| Server middleware | `requireAuth` | `requireAdmin` |
| API prefix | `/api/*` | `/api/admin/*` |

This means a user logged in to the main app is **not** automatically logged in to the admin panel, and vice versa.

## Architecture

```
admin/src/
├── api/
│   ├── api.ts            # Axios instance
│   └── admin.ts          # getStats(), getUsers(), getUser(), getUserResumes(),
│                         # getLogs(), getJobDetail()
├── context/
│   └── AdminAuthContext.tsx  # Fetches /api/admin/auth/me; useAdminAuth() → { admin, loading }
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx     # Stats cards
│   ├── Users.tsx         # User list table
│   ├── UserDetail.tsx    # User profile + resumes + jobs
│   ├── JobDetail.tsx     # Job outputs + amendments
│   ├── Logs.tsx          # Activity log
│   └── Resumes.tsx       # Resume list
└── components/
    ├── AdminLayout.tsx       # Shell with top nav
    ├── DataTable.tsx         # Reusable sortable/filterable table
    ├── StatCard.tsx          # Dashboard stat card
    ├── ActivityTimeline.tsx  # Activity feed
    └── ConfirmDialog.tsx     # Confirm modal
```

## Notes

- This is a **read-only** panel — no write or delete operations are exposed through the admin API
- `DataTable.tsx` is the primary display primitive — reuse it for any new list view
- Styling is intentionally minimal and data-dense
```

- [ ] **Step 2: Commit**

```bash
git add admin/README.md
git commit -m "docs: add admin README"
```

---

### Task 5: Replace `landing/README.md`

**Files:**
- Replace: `landing/README.md` (currently Next.js boilerplate)

- [ ] **Step 1: Write `landing/README.md`**:

```markdown
# Landing

Static marketing site for Resume AI. Single-page Next.js app exported to static HTML and deployed to Vercel.

> Part of the [resume-app](../README.md) monorepo.
> **Note:** This Next.js version may have breaking changes from older releases. Read `node_modules/next/dist/docs/` before writing code. See also `AGENTS.md`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| UI | React 19, TailwindCSS |
| Animation | Framer Motion |
| Output | Static export (`output: 'export'`) |
| Deployment | Vercel |

## Getting Started

```bash
# From the repo root
npm run dev:landing
```

Opens on [http://localhost:3001](http://localhost:3001).

### Build

```bash
cd landing
npm run build
```

Produces a fully static site in `landing/out/`. No server required.

## Structure

```
landing/
├── app/
│   ├── layout.tsx    # Root layout: metadata, fonts, global CSS
│   ├── page.tsx      # Home page — composes all section components
│   ├── globals.css
│   ├── robots.ts     # SEO: robots.txt
│   └── sitemap.ts    # SEO: sitemap.xml
├── components/
│   ├── Navbar.tsx            # Navigation with CTA
│   ├── Hero.tsx              # Headline + primary CTA
│   ├── FeaturesSection.tsx   # Feature grid
│   ├── HowItWorks.tsx        # 3-step walkthrough
│   ├── TemplatesSection.tsx  # Resume template showcase
│   ├── WhySection.tsx        # Value proposition
│   └── Footer.tsx
└── public/                   # Static assets (images, og-image.png)
```

## Deployment

Deployed to Vercel as a static site. `vercel.json` is already configured.

1. Connect the GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `landing`, Framework: **Next.js**
3. No environment variables required
4. Vercel runs `next build` → static export → deploys from `out/`

Push to `main` triggers an automatic redeploy.

## Adding a Section

1. Create `components/MySection.tsx`
2. Import and add it to `app/page.tsx` in the desired order
3. Use Framer Motion for entrance animations:

```tsx
import { motion } from 'framer-motion';

export default function MySection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      {/* content */}
    </motion.section>
  );
}
```

## Constraints

- `output: 'export'` is set — do not use features incompatible with static export:
  - No `getServerSideProps`
  - No API routes
  - No `next/image` optimization (use plain `<img>` tags)
- No environment variables — this is a fully static site
- The `@/*` path alias maps to the project root (set in `tsconfig.json`)
```

- [ ] **Step 2: Commit**

```bash
git add landing/README.md
git commit -m "docs: replace landing README boilerplate with real documentation"
```
