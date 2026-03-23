# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully isolated admin panel at `admin.resumeai.com` with user/resume management, activity logging, and platform stats.

**Architecture:** New `admin/` NPM workspace (Vite + React + TypeScript) talking to new `/api/admin/*` Express routes. Admin auth uses a separate Google OAuth Passport strategy (`'google-admin'`) restricted to `ADMIN_EMAILS`. Sessions are isolated via path-conditional session middleware: `/api/admin` requests use an `admin.sid` session; all other requests use the regular `connect.sid` session.

**Tech Stack:** Express + Prisma + PostgreSQL (server), Vite + React 18 + TypeScript + Tailwind + Lucide + React Query + Axios (admin frontend), passport-google-oauth20, express-session, zod.

**Spec:** `docs/superpowers/specs/2026-03-23-admin-panel-design.md`

---

## File Map

### Server — new files
- `server/src/services/activityLog.ts` — `logActivity()` helper, fire-and-forget
- `server/src/middleware/requireAdmin.ts` — checks `req.user._type === 'admin'`
- `server/src/middleware/updateLastActive.ts` — throttled `lastActiveAt` update (max 1/hr)
- `server/src/routes/admin/index.ts` — mounts admin session + sub-routers
- `server/src/routes/admin/auth.ts` — admin Google OAuth routes
- `server/src/routes/admin/stats.ts` — `GET /api/admin/stats`
- `server/src/routes/admin/users.ts` — user list, detail, delete
- `server/src/routes/admin/resumes.ts` — resume list, delete
- `server/src/routes/admin/logs.ts` — activity log query

### Server — modified files
- `server/prisma/schema.prisma` — add `AdminUser`, `ActivityLog`, `lastActiveAt` on `User`
- `server/src/config/env.ts` — add admin env vars
- `server/src/config/passport.ts` — add `'google-admin'` strategy, discriminated serialize/deserialize
- `server/src/app.ts` — path-conditional session, CORS multi-origin, mount `/api/admin`, `updateLastActive`
- `server/src/routes/auth.ts` — log LOGIN, LOGOUT, ACCOUNT_DELETED
- `server/src/routes/resumes.ts` — log RESUME_CREATED, RESUME_DELETED, RESUME_ARCHIVED
- `server/src/routes/jobs.ts` — log JOB_CREATED, JOB_DELETED
- `server/src/routes/ai.ts` — log AI_TAILOR, AI_COVER_LETTER, AI_INTERVIEW_PREP, AI_SUMMARY, INTERVIEW_PREP_GENERATED
- `server/src/routes/profile.ts` — log PROFILE_UPDATED
- `server/.env` / `server/.env.example` — add admin env vars

### Root monorepo — modified files
- `package.json` — add `"admin"` to workspaces, add `dev:admin` script

### Admin workspace — new files
- `admin/package.json`
- `admin/vite.config.ts`
- `admin/tsconfig.json`
- `admin/index.html`
- `admin/src/main.tsx`
- `admin/src/index.css`
- `admin/src/App.tsx` — router + AdminAuthGuard
- `admin/src/api/api.ts` — axios instance
- `admin/src/api/admin.ts` — typed API wrappers
- `admin/src/context/AdminAuthContext.tsx` — admin session state
- `admin/src/components/AdminLayout.tsx`
- `admin/src/components/StatCard.tsx`
- `admin/src/components/DataTable.tsx`
- `admin/src/components/ConfirmDialog.tsx`
- `admin/src/components/ActivityTimeline.tsx`
- `admin/src/pages/Login.tsx`
- `admin/src/pages/Dashboard.tsx`
- `admin/src/pages/Users.tsx`
- `admin/src/pages/UserDetail.tsx`
- `admin/src/pages/Logs.tsx`

---

## Task 1: Prisma schema changes

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add `AdminUser` model, `ActivityLog` model, `ActivityAction` enum, and `lastActiveAt` field to `User`**

Open `server/prisma/schema.prisma`. Make these three changes:

**1a. Add `lastActiveAt` to the `User` model** (after `updatedAt`):
```prisma
updatedAt     DateTime @updatedAt
lastActiveAt  DateTime?
```

**1b. Append `AdminUser` model** (after the existing `UserJobStatus` model at the end):
```prisma
// ─── ADMIN ───────────────────────────────────────────────────────────────────

model AdminUser {
  id          String   @id @default(cuid())
  email       String   @unique
  displayName String?
  avatarUrl   String?
  provider    String
  providerId  String
  createdAt   DateTime @default(now())

  @@unique([provider, providerId])
}
```

**1c. Append `ActivityLog` model and `ActivityAction` enum** (after `AdminUser`):
```prisma
model ActivityLog {
  id        String         @id @default(cuid())
  userId    String
  action    ActivityAction
  metadata  Json?
  createdAt DateTime       @default(now())
}

enum ActivityAction {
  LOGIN
  LOGOUT
  RESUME_CREATED
  RESUME_DELETED
  RESUME_ARCHIVED
  JOB_CREATED
  JOB_DELETED
  AI_TAILOR
  AI_COVER_LETTER
  AI_INTERVIEW_PREP
  AI_SUMMARY
  INTERVIEW_PREP_GENERATED
  PROFILE_UPDATED
  ACCOUNT_DELETED
}
```

- [ ] **Step 2: Run migration**

```bash
cd /path/to/resume-app
npm run db:migrate
```

Expected: Prisma applies the migration, generates updated client. You should see output like:
```
Your database is now in sync with your schema.
```

- [ ] **Step 3: Verify**

```bash
npm run db:studio --workspace=server
```

Open Prisma Studio at `http://localhost:5555`. Confirm `AdminUser` and `ActivityLog` tables are listed, and `User` table has `lastActiveAt` column.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add AdminUser, ActivityLog schema and lastActiveAt on User"
```

---

## Task 2: Server env config

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/.env` (add vars; do NOT commit)
- Modify: `server/.env.example` (add placeholder entries)

- [ ] **Step 1: Update `server/src/config/env.ts`**

Add these fields to the `envSchema` object (inside the `z.object({...})`), after the existing `CLIENT_URL` line:

```typescript
ADMIN_EMAILS: z.string().optional(),
ADMIN_SESSION_SECRET: z.string().min(32).optional(),
ADMIN_GOOGLE_CLIENT_ID: z.string().optional(),
ADMIN_GOOGLE_CLIENT_SECRET: z.string().optional(),
ADMIN_GOOGLE_CALLBACK_URL: z.string().optional(),
ADMIN_URL: z.string().optional(),
```

- [ ] **Step 2: Add to `server/.env`**

Append these lines (fill in real values for your environment):
```
ADMIN_EMAILS=your-email@gmail.com
ADMIN_SESSION_SECRET=replace-with-32-plus-char-random-string-here
ADMIN_GOOGLE_CLIENT_ID=your-admin-google-client-id
ADMIN_GOOGLE_CLIENT_SECRET=your-admin-google-client-secret
ADMIN_GOOGLE_CALLBACK_URL=http://localhost:5174/api/admin/auth/google/callback
ADMIN_URL=http://localhost:5174
```

Note: Create a separate Google OAuth app in Google Cloud Console for the admin panel. Set the authorized callback URI to `http://localhost:5174/api/admin/auth/google/callback` for local dev and `https://admin.resumeai.com/api/admin/auth/google/callback` for production.

- [ ] **Step 3: Add to `server/.env.example`**

Append these placeholder lines:
```
ADMIN_EMAILS=admin@example.com
ADMIN_SESSION_SECRET=replace-with-32-plus-char-random-string-here
ADMIN_GOOGLE_CLIENT_ID=
ADMIN_GOOGLE_CLIENT_SECRET=
ADMIN_GOOGLE_CALLBACK_URL=http://localhost:5174/api/admin/auth/google/callback
ADMIN_URL=http://localhost:5174
```

- [ ] **Step 4: Commit**

```bash
git add server/src/config/env.ts server/.env.example
git commit -m "feat: add admin env var schema"
```

---

## Task 3: `activityLog` service

**Files:**
- Create: `server/src/services/activityLog.ts`

- [ ] **Step 1: Create the file**

```typescript
import { ActivityAction } from '@prisma/client';
import { prisma } from '../config/prisma';

export { ActivityAction };

export async function logActivity(
  userId: string,
  action: ActivityAction,
  metadata?: object
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, metadata: metadata ?? {} },
    });
  } catch {
    // Fire-and-forget: logging failures never break user-facing requests
  }
}
```

- [ ] **Step 2: Verify the server compiles**

```bash
npm run build --workspace=server
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/activityLog.ts
git commit -m "feat: add activityLog service"
```

---

## Task 4: `updateLastActive` middleware

**Files:**
- Create: `server/src/middleware/updateLastActive.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function updateLastActive(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user?.id || user?._type !== 'user') return next();

  const lastActive: Date | null = user.lastActiveAt ?? null;
  const now = new Date();

  if (!lastActive || now.getTime() - lastActive.getTime() > ONE_HOUR_MS) {
    // Fire-and-forget: don't block the request
    prisma.user
      .update({ where: { id: user.id }, data: { lastActiveAt: now } })
      .catch(() => {});
  }

  next();
}
```

- [ ] **Step 2: Compile check**

```bash
npm run build --workspace=server
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/updateLastActive.ts
git commit -m "feat: add updateLastActive middleware"
```

---

## Task 5: Update Passport config

**Files:**
- Modify: `server/src/config/passport.ts`

The existing code serializes just `id: string`. We need to change to `{ type: 'user' | 'admin', id }` so sessions can be discriminated. The deserializer handles both formats (old string format for backward compat + new object format).

- [ ] **Step 1: Replace the entire file**

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from './prisma';
import { env } from './env';
import { logActivity, ActivityAction } from '../services/activityLog';

type SerializedUser = { type: 'user' | 'admin'; id: string };

passport.serializeUser((user: any, done) => {
  done(null, { type: user._type ?? 'user', id: user.id } as SerializedUser);
});

passport.deserializeUser(async (serialized: string | SerializedUser, done) => {
  try {
    // Handle legacy sessions that stored just the id string
    if (typeof serialized === 'string') {
      const user = await prisma.user.findUnique({ where: { id: serialized } });
      done(null, user ? { ...user, _type: 'user' } : false);
      return;
    }

    if (serialized.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({ where: { id: serialized.id } });
      done(null, admin ? { ...admin, _type: 'admin' } : false);
    } else {
      const user = await prisma.user.findUnique({ where: { id: serialized.id } });
      done(null, user ? { ...user, _type: 'user' } : false);
    }
  } catch (err) {
    done(err);
  }
});

async function upsertUser(
  provider: string,
  providerId: string,
  email: string,
  displayName: string | undefined,
  avatarUrl: string | undefined
) {
  return prisma.user.upsert({
    where: { provider_providerId: { provider, providerId } },
    update: { displayName, avatarUrl, email },
    create: { provider, providerId, email, displayName, avatarUrl },
  });
}

// ─── User: Google ─────────────────────────────────────────────────────────────

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;
          const user = await upsertUser('google', profile.id, email, profile.displayName, profile.photos?.[0]?.value);
          logActivity(user.id, ActivityAction.LOGIN).catch(() => {});
          done(null, { ...user, _type: 'user' });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ─── User: GitHub ─────────────────────────────────────────────────────────────

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_CALLBACK_URL) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@github.com`;
          const user = await upsertUser('github', profile.id, email, profile.displayName ?? profile.username, profile.photos?.[0]?.value);
          logActivity(user.id, ActivityAction.LOGIN).catch(() => {});
          done(null, { ...user, _type: 'user' });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ─── Admin: Google ────────────────────────────────────────────────────────────

if (env.ADMIN_GOOGLE_CLIENT_ID && env.ADMIN_GOOGLE_CLIENT_SECRET && env.ADMIN_GOOGLE_CALLBACK_URL) {
  passport.use(
    'google-admin',
    new GoogleStrategy(
      {
        clientID: env.ADMIN_GOOGLE_CLIENT_ID,
        clientSecret: env.ADMIN_GOOGLE_CLIENT_SECRET,
        callbackURL: env.ADMIN_GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;

          // Validate email against allowlist before creating/upsert
          const allowedEmails = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
          if (!allowedEmails.includes(email)) {
            return done(null, false);
          }

          const admin = await prisma.adminUser.upsert({
            where: { provider_providerId: { provider: 'google', providerId: profile.id } },
            update: { displayName: profile.displayName, avatarUrl: profile.photos?.[0]?.value, email },
            create: {
              provider: 'google',
              providerId: profile.id,
              email,
              displayName: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });

          // Note: admin logins are NOT logged in ActivityLog — ActivityLog tracks user activity only.
          // Admin users are in the AdminUser table, not User table, so logging their ID would
          // produce orphaned entries that show as "[deleted]" in the logs page.
          done(null, { ...admin, _type: 'admin' });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export default passport;
```

- [ ] **Step 2: Compile check**

```bash
npm run build --workspace=server
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/config/passport.ts
git commit -m "feat: add google-admin passport strategy and discriminated session serialization"
```

---

## Task 6: `requireAdmin` middleware + admin router scaffold

**Files:**
- Create: `server/src/middleware/requireAdmin.ts`
- Create: `server/src/routes/admin/index.ts`

- [ ] **Step 1: Create `requireAdmin.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (req.isAuthenticated() && user?._type === 'admin') return next();
  res.status(401).json({ error: 'Unauthorized' });
}

export function getAdmin(req: Request): { id: string; email: string; displayName: string | null } {
  return req.user as any;
}
```

- [ ] **Step 2: Create `server/src/routes/admin/index.ts`**

This file sets up the admin session middleware and mounts all admin sub-routers. The admin session runs before `passport.session()` re-populates `req.user` for this path scope (handled at the app level — see Task 11).

```typescript
import { Router } from 'express';
import authRouter from './auth';
import statsRouter from './stats';
import usersRouter from './users';
import resumesRouter from './resumes';
import logsRouter from './logs';
import { requireAdmin } from '../../middleware/requireAdmin';

const router = Router();

// Auth routes — not protected (login/callback/me)
router.use('/auth', authRouter);

// All other admin routes — require admin session
router.use(requireAdmin);
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/resumes', resumesRouter);
router.use('/logs', logsRouter);

export default router;
```

- [ ] **Step 3: Compile check**

```bash
npm run build --workspace=server
```

Expected: errors only about missing sub-router files (auth.ts, stats.ts, etc.) — those come in later tasks. If those are the only errors, that's fine.

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/requireAdmin.ts server/src/routes/admin/index.ts
git commit -m "feat: add requireAdmin middleware and admin router scaffold"
```

---

## Task 7: Admin auth routes

**Files:**
- Create: `server/src/routes/admin/auth.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router } from 'express';
import passport from '../../config/passport';
import { env } from '../../config/env';
import { requireAdmin, getAdmin } from '../../middleware/requireAdmin';

const router = Router();

router.get('/google', passport.authenticate('google-admin', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google-admin', { failureRedirect: `${env.ADMIN_URL ?? 'http://localhost:5174'}/login?error=auth` }),
  (req, res) => {
    // passport.authenticate sets req.user; if it's falsy the strategy called done(null, false)
    // which means email not in ADMIN_EMAILS — failureRedirect handles it above.
    res.redirect(`${env.ADMIN_URL ?? 'http://localhost:5174'}/dashboard`);
  }
);

router.get('/me', requireAdmin, (req, res) => {
  const admin = getAdmin(req);
  res.json({ id: admin.id, email: admin.email, displayName: admin.displayName });
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ success: true }));
  });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/auth.ts
git commit -m "feat: add admin auth routes (Google OAuth)"
```

---

## Task 8: Admin stats route

**Files:**
- Create: `server/src/routes/admin/stats.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ActivityAction } from '../../services/activityLog';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      resumesByStatus,
      totalJobs,
      resumesDeletedCount,
      resumesArchivedCount,
      aiTailorCount,
      aiCoverLetterCount,
      aiInterviewPrepCount,
      aiSummaryCount,
      uniqueVisitorsResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.resume.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.jobApplication.count(),
      prisma.activityLog.count({ where: { action: ActivityAction.RESUME_DELETED } }),
      prisma.activityLog.count({ where: { action: ActivityAction.RESUME_ARCHIVED } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_TAILOR } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_COVER_LETTER } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_INTERVIEW_PREP } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_SUMMARY } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId") as count FROM "ActivityLog" WHERE action = 'LOGIN'
      `,
    ]);

    const resumeStatusMap = Object.fromEntries(
      resumesByStatus.map((r) => [r.status, r._count.status])
    );

    res.json({
      totalUsers,
      resumes: {
        draft: resumeStatusMap['DRAFT'] ?? 0,
        final: resumeStatusMap['FINAL'] ?? 0,
        archived: resumeStatusMap['ARCHIVED'] ?? 0,
      },
      resumesDeleted: resumesDeletedCount,
      resumesArchived: resumesArchivedCount,
      totalJobs,
      uniqueVisitors: Number(uniqueVisitorsResult[0]?.count ?? 0),
      aiUsage: {
        tailor: aiTailorCount,
        coverLetter: aiCoverLetterCount,
        interviewPrep: aiInterviewPrepCount,
        summary: aiSummaryCount,
      },
    });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/stats.ts
git commit -m "feat: add admin stats route"
```

---

## Task 9: Admin users route

**Files:**
- Create: `server/src/routes/admin/users.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { logActivity, ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/users?page=1&limit=20&search=email
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) ?? '';
    const skip = (page - 1) * limit;

    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          lastActiveAt: true,
          _count: { select: { resumes: true, jobApplications: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/admin/users/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user, resumes, jobs, aiAmendmentCount, activityLog] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.resume.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true, templateId: true, tailoredFor: true, createdAt: true },
      }),
      prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, company: true, jobTitle: true, status: true, appliedAt: true, createdAt: true },
      }),
      prisma.aiAmendment.count({
        where: { jobApplication: { userId } },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const aiUsage = {
      tailor: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_TAILOR } }),
      coverLetter: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_COVER_LETTER } }),
      interviewPrep: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_INTERVIEW_PREP } }),
      summary: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_SUMMARY } }),
    };

    res.json({ user, resumes, jobs, aiAmendmentCount, aiUsage, activityLog });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:userId
router.delete('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Log BEFORE delete so the record exists even if delete fails
    await logActivity(userId, ActivityAction.ACCOUNT_DELETED, {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });

    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/users.ts
git commit -m "feat: add admin users routes (list, detail, delete)"
```

---

## Task 10: Admin resumes route

**Files:**
- Create: `server/src/routes/admin/resumes.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { logActivity, ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/resumes?page=1&limit=20&status=DRAFT
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          templateId: true,
          tailoredFor: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.resume.count({ where }),
    ]);

    res.json({ data: resumes, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// DELETE /api/admin/resumes/:resumeId
router.delete('/:resumeId', async (req, res, next) => {
  try {
    const { resumeId } = req.params;

    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    // Log BEFORE delete — snapshot key fields
    await logActivity(resume.userId, ActivityAction.RESUME_DELETED, {
      resumeId: resume.id,
      title: resume.title,
      templateId: resume.templateId,
      status: resume.status,
      createdAt: resume.createdAt,
    });

    await prisma.resume.delete({ where: { id: resumeId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/resumes.ts
git commit -m "feat: add admin resumes routes (list, delete)"
```

---

## Task 11: Admin logs route

**Files:**
- Create: `server/src/routes/admin/logs.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/logs?page=1&limit=50&userId=x&action=LOGIN
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as ActivityAction | undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Enrich logs with user email for display (best-effort — user may be deleted)
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, displayName: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = logs.map((log) => ({
      ...log,
      user: userMap[log.userId] ?? { id: log.userId, email: '[deleted]', displayName: null },
    }));

    res.json({ data: enriched, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/logs.ts
git commit -m "feat: add admin logs route"
```

---

## Task 12: Update `app.ts` — CORS, sessions, mount admin router, updateLastActive

**Files:**
- Modify: `server/src/app.ts`

This is the most complex change. We need to:
1. Update CORS to accept multiple origins
2. Replace the single session block with path-conditional session middleware
3. Mount the admin router
4. Add `updateLastActive` middleware

- [ ] **Step 1: Replace the entire `server/src/app.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { updateLastActive } from './middleware/updateLastActive';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import resumesRouter from './routes/resumes';
import jobsRouter from './routes/jobs';
import jobStatusesRouter from './routes/jobStatuses';
import aiRouter from './routes/ai';
import templatesRouter from './routes/templates';
import interviewPrepRouter from './routes/interviewPrep';
import toursRouter from './routes/tours';
import adminRouter from './routes/admin/index';

const PgSession = connectPgSimple(session);

const sessionPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const userSession = session({
  name: 'connect.sid',
  store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

const adminSession = session({
  name: 'admin.sid',
  store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
  secret: env.ADMIN_SESSION_SECRET ?? env.SESSION_SECRET, // env.ADMIN_SESSION_SECRET should always be set in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

export function createApp() {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));

  // Multi-origin CORS: allow both the main client and admin panel
  const allowedOrigins = [env.CLIENT_URL];
  if (env.ADMIN_URL) allowedOrigins.push(env.ADMIN_URL);
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  app.use(morgan('dev'));
  app.use(express.json({ limit: '2mb' }));

  // Path-conditional session: admin routes use admin.sid, all others use connect.sid
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin')) {
      adminSession(req, res, next);
    } else {
      userSession(req, res, next);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Update lastActiveAt for authenticated user requests (throttled to once/hr)
  app.use(updateLastActive);

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/job-statuses', jobStatusesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/interview-prep', interviewPrepRouter);
  app.use('/api/tours', toursRouter);
  app.use('/api/admin', adminRouter);

  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 2: Compile check**

```bash
npm run build --workspace=server
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: update app.ts — path-conditional sessions, multi-origin CORS, mount admin router"
```

---

## Task 13: Hook activity logging into existing routes

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/src/routes/resumes.ts`
- Modify: `server/src/routes/jobs.ts`
- Modify: `server/src/routes/ai.ts`
- Modify: `server/src/routes/profile.ts`
- Modify: `server/src/routes/interviewPrep.ts`

### 13a: `auth.ts`

- [ ] **Step 1: Add logging to `auth.ts`**

Add the import at the top of `server/src/routes/auth.ts`:
```typescript
import { logActivity, ActivityAction } from '../services/activityLog';
```

In the `POST /logout` handler, add a log call BEFORE `req.logout`:
```typescript
router.post('/logout', (req, res, next) => {
  const user = req.user as any;
  if (user?.id) logActivity(user.id, ActivityAction.LOGOUT).catch(() => {});
  req.logout((err) => {
    // ... existing code
  });
});
```

In the `DELETE /account` handler, add a log call BEFORE `prisma.user.delete`:
```typescript
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const user = getUser(req) as any;
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    await logActivity(user.id, ActivityAction.ACCOUNT_DELETED, {
      userId: user.id,
      email: fullUser?.email,
      displayName: fullUser?.displayName,
      createdAt: fullUser?.createdAt,
    });
    await prisma.user.delete({ where: { id: user.id } });
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => res.json({ success: true }));
    });
  } catch (err) { next(err); }
});
```

Note: The Google OAuth LOGIN log is already handled in `passport.ts` (Task 5).

### 13b: `resumes.ts`

- [ ] **Step 2: Add logging to `resumes.ts`**

Add import:
```typescript
import { logActivity, ActivityAction } from '../services/activityLog';
```

In `POST /` (create resume), after `prisma.resume.create`, add:
```typescript
logActivity(getUser(req).id, ActivityAction.RESUME_CREATED, {
  resumeId: resume.id,
  title: resume.title,
  templateId: resume.templateId,
}).catch(() => {});
```

In `PUT /:id` (update resume), after the `prisma.resume.updateMany` call, check if status changed to ARCHIVED:
```typescript
// After: const updated = await prisma.resume.findUnique(...)
if (req.body.status === 'ARCHIVED' && updated) {
  logActivity(getUser(req).id, ActivityAction.RESUME_ARCHIVED, {
    resumeId: updated.id,
    title: updated.title,
  }).catch(() => {});
}
```

In `DELETE /:id` (delete resume), fetch the resume before deleting and log:
```typescript
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id, userId } });
    if (resume) {
      await logActivity(userId, ActivityAction.RESUME_DELETED, {
        resumeId: resume.id,
        title: resume.title,
        templateId: resume.templateId,
        status: resume.status,
        createdAt: resume.createdAt,
      });
    }
    await prisma.resume.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
```

### 13c: `jobs.ts`

- [ ] **Step 3: Add logging to `jobs.ts`**

Add import:
```typescript
import { logActivity, ActivityAction } from '../services/activityLog';
```

In `POST /` (create job), after `prisma.jobApplication.create`:
```typescript
logActivity(getUser(req).id, ActivityAction.JOB_CREATED, {
  jobId: job.id,
  company: job.company,
  jobTitle: job.jobTitle,
}).catch(() => {});
```

Find the `DELETE /:id` handler in `jobs.ts` and update it to log before delete:
```typescript
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const job = await prisma.jobApplication.findFirst({ where: { id: req.params.id, userId } });
    if (job) {
      await logActivity(userId, ActivityAction.JOB_DELETED, {
        jobId: job.id,
        company: job.company,
        jobTitle: job.jobTitle,
      });
    }
    await prisma.jobApplication.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
```

### 13d: `ai.ts`

- [ ] **Step 4: Add logging to `ai.ts`**

Add import:
```typescript
import { logActivity, ActivityAction } from '../services/activityLog';
```

In `POST /tailor`, after `prisma.resume.create` (clone creation):
```typescript
logActivity(userId, ActivityAction.AI_TAILOR, {
  jobId: req.body.jobId,
  resumeId: clone.id,
}).catch(() => {});
```

In `POST /cover-letter`, after `prisma.aiAmendment.create` (the amendment record, line ~145), add:
```typescript
logActivity(userId, ActivityAction.AI_COVER_LETTER, { jobId: req.body.jobId }).catch(() => {});
res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
res.end();
```

Note: the cover letter route is SSE streaming. The log goes after the amendment is saved but before `res.end()`. If `jobId` is not provided, still log it (without a jobId in metadata):
```typescript
logActivity(userId, ActivityAction.AI_COVER_LETTER, { jobId: req.body.jobId ?? null }).catch(() => {});
```

In `POST /improve-summary` or `POST /generate-summary` (whichever generates summary), after the AI call succeeds:
```typescript
logActivity(userId, ActivityAction.AI_SUMMARY).catch(() => {});
```

Read `server/src/routes/ai.ts` to find the exact handler names before applying these changes. Look for where `improveSummary` and `generateSummary` are called.

### 13e: `profile.ts`

- [ ] **Step 5: Add logging to `profile.ts`**

Add import at the top of `server/src/routes/profile.ts`:
```typescript
import { logActivity, ActivityAction } from '../services/activityLog';
```

In the `router.put('/', ...)` handler (line 87), after `prisma.profile.update`, add the log:
```typescript
router.put('/', validateBody(profileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.update({ where: { userId: getUser(req).id }, data: req.body });
    logActivity(getUser(req).id, ActivityAction.PROFILE_UPDATED).catch(() => {});  // add this line
    res.json(profile);
  } catch (err) { next(err); }
});
```

### 13f: `ai.ts` — interview prep and summary logging

Interview prep generation is in `server/src/routes/ai.ts`, not `interviewPrep.ts`. There are two relevant routes:
- `POST /ai/interview-questions` (line ~328) — this is where the `InterviewPrep` record is upserted; log `INTERVIEW_PREP_GENERATED` here
- `POST /ai/generate-summary` (line ~253) and `POST /ai/improve-summary` (line ~281) — log `AI_SUMMARY` in both

The `AI_TAILOR` and `AI_COVER_LETTER` logging is also in `ai.ts` (Steps 4 above covered those).

- [ ] **Step 6: Add INTERVIEW_PREP_GENERATED log to `POST /ai/interview-questions` in `ai.ts`**

In the `POST /interview-questions` handler, after `prisma.interviewPrep.upsert` (around line 374), add:
```typescript
const prep = await prisma.interviewPrep.upsert({
  where: { jobId },
  create: { jobId, userId: user.id, categories: categories as any },
  update: { categories: categories as any },
});

// Add this line after the upsert:
logActivity(user.id, ActivityAction.INTERVIEW_PREP_GENERATED, { jobId }).catch(() => {});

res.json(prep);
```

- [ ] **Step 7: Add AI_SUMMARY log to `POST /ai/generate-summary` in `ai.ts`**

In the `POST /generate-summary` handler (line ~253), after `prisma.profile.update`, add:
```typescript
logActivity(userId, ActivityAction.AI_SUMMARY).catch(() => {});
```

In the `POST /improve-summary` handler (line ~281), after `res.json(...)` line, add the log BEFORE the response — change to:
```typescript
const improved = await improveSummary(req.body.currentSummary, req.body.targetRole);
logActivity(getUser(req).id, ActivityAction.AI_SUMMARY).catch(() => {});
res.json({ summary: improved });
```

- [ ] **Step 7: Compile check**

```bash
npm run build --workspace=server
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/auth.ts server/src/routes/resumes.ts server/src/routes/jobs.ts server/src/routes/ai.ts server/src/routes/profile.ts server/src/routes/interviewPrep.ts
git commit -m "feat: hook activity logging into existing routes"
```

---

## Task 14: Start server and smoke-test backend

- [ ] **Step 1: Start dev server**

```bash
npm run dev:server
```

Expected: Server starts on port 3000, no crashes.

- [ ] **Step 2: Smoke-test admin auth endpoint**

```bash
curl http://localhost:3000/api/admin/auth/me
```

Expected: `{"error":"Unauthorized"}` — correct, no admin session yet.

- [ ] **Step 3: Smoke-test admin stats (should 401)**

```bash
curl http://localhost:3000/api/admin/stats
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit nothing** (no code changes, just verification)

---

## Task 15: Monorepo + admin workspace scaffold

**Files:**
- Modify: `package.json` (root)
- Create: `admin/package.json`
- Create: `admin/vite.config.ts`
- Create: `admin/tsconfig.json`
- Create: `admin/index.html`
- Create: `admin/src/main.tsx`
- Create: `admin/src/index.css`

- [ ] **Step 1: Update root `package.json`**

Change `"workspaces"` to:
```json
"workspaces": ["client", "server", "admin"]
```

Change the `"dev"` script to include admin:
```json
"dev": "docker-compose -f docker-compose.dev.yml up -d --wait postgres && concurrently \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:admin\" \"npm run dev:landing\"",
"dev:admin": "npm run dev --workspace=admin",
```

- [ ] **Step 2: Create `admin/package.json`**

```json
{
  "name": "admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.16",
    "axios": "^1.7.9",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5"
  }
}
```

- [ ] **Step 3: Create `admin/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        credentials: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create `admin/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `admin/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ResumeAI Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `admin/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Create `admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-950 text-gray-100;
}
```

- [ ] **Step 8: Create `admin/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 9: Create `admin/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 10: Install admin deps**

```bash
cd /path/to/resume-app
npm install
```

Expected: installs `admin/` workspace deps.

- [ ] **Step 11: Commit**

```bash
git add package.json admin/
git commit -m "feat: scaffold admin workspace (Vite + React + Tailwind)"
```

---

## Task 16: Admin API client

**Files:**
- Create: `admin/src/api/api.ts`
- Create: `admin/src/api/admin.ts`

- [ ] **Step 1: Create `admin/src/api/api.ts`**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default api;
```

- [ ] **Step 2: Create `admin/src/api/admin.ts`**

```typescript
import api from './api';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageCount: number;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  _count: { resumes: number; jobApplications: number };
}

export interface UserDetail {
  user: { id: string; email: string; displayName: string | null; createdAt: string; lastActiveAt: string | null; profile: { firstName: string; lastName: string; location: string | null } | null };
  resumes: { id: string; title: string; status: string; templateId: string; tailoredFor: string | null; createdAt: string }[];
  jobs: { id: string; company: string; jobTitle: string; status: string; appliedAt: string | null; createdAt: string }[];
  aiAmendmentCount: number;
  aiUsage: { tailor: number; coverLetter: number; interviewPrep: number; summary: number };
  activityLog: ActivityLogEntry[];
}

export interface ResumeSummary {
  id: string;
  title: string;
  status: string;
  templateId: string;
  tailoredFor: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string | null };
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; email: string; displayName: string | null };
}

export interface Stats {
  totalUsers: number;
  resumes: { draft: number; final: number; archived: number };
  resumesDeleted: number;
  resumesArchived: number;
  totalJobs: number;
  uniqueVisitors: number;
  aiUsage: { tailor: number; coverLetter: number; interviewPrep: number; summary: number };
}

export const adminApi = {
  getMe: () => api.get<AdminUser>('/admin/auth/me').then((r) => r.data),
  logout: () => api.post('/admin/auth/logout').then((r) => r.data),

  getStats: () => api.get<Stats>('/admin/stats').then((r) => r.data),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<UserSummary>>('/admin/users', { params }).then((r) => r.data),
  getUser: (userId: string) => api.get<UserDetail>(`/admin/users/${userId}`).then((r) => r.data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`).then((r) => r.data),

  getResumes: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<ResumeSummary>>('/admin/resumes', { params }).then((r) => r.data),
  deleteResume: (resumeId: string) => api.delete(`/admin/resumes/${resumeId}`).then((r) => r.data),

  getLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string }) =>
    api.get<PaginatedResponse<ActivityLogEntry>>('/admin/logs', { params }).then((r) => r.data),
};
```

- [ ] **Step 3: Commit**

```bash
git add admin/src/api/
git commit -m "feat: add admin API client"
```

---

## Task 17: Admin auth context + shared components

**Files:**
- Create: `admin/src/context/AdminAuthContext.tsx`
- Create: `admin/src/components/AdminLayout.tsx`
- Create: `admin/src/components/StatCard.tsx`
- Create: `admin/src/components/DataTable.tsx`
- Create: `admin/src/components/ConfirmDialog.tsx`
- Create: `admin/src/components/ActivityTimeline.tsx`

- [ ] **Step 1: Create `admin/src/context/AdminAuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminApi, AdminUser } from '../api/admin';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  refetch: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  admin: null,
  loading: true,
  refetch: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = () => {
    setLoading(true);
    adminApi
      .getMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMe(); }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refetch: fetchMe }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
```

- [ ] **Step 2: Create `admin/src/components/AdminLayout.tsx`**

```tsx
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Activity, LogOut } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/admin';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/logs', label: 'Activity Logs', icon: Activity },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin } = useAdminAuth();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    await adminApi.logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <p className="text-xs text-gray-400 font-mono">ResumeAI</p>
          <p className="text-sm font-semibold text-white">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname.startsWith(to)
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create `admin/src/components/StatCard.tsx`**

```tsx
interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create `admin/src/components/DataTable.tsx`**

```tsx
import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageCount,
  onPageChange,
  emptyMessage = 'No results',
}: DataTableProps<T>) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="bg-gray-950 hover:bg-gray-900 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-300">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `admin/src/components/ConfirmDialog.tsx`**

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-gray-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `admin/src/components/ActivityTimeline.tsx`**

```tsx
import { ActivityLogEntry } from '../api/admin';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-500',
  LOGOUT: 'bg-gray-500',
  RESUME_CREATED: 'bg-blue-500',
  RESUME_DELETED: 'bg-red-500',
  RESUME_ARCHIVED: 'bg-yellow-500',
  JOB_CREATED: 'bg-purple-500',
  JOB_DELETED: 'bg-red-400',
  AI_TAILOR: 'bg-indigo-500',
  AI_COVER_LETTER: 'bg-indigo-400',
  AI_INTERVIEW_PREP: 'bg-teal-500',
  AI_SUMMARY: 'bg-cyan-500',
  PROFILE_UPDATED: 'bg-orange-400',
  ACCOUNT_DELETED: 'bg-red-700',
  INTERVIEW_PREP_GENERATED: 'bg-teal-400',
};

export function ActivityTimeline({ logs }: { logs: ActivityLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No activity recorded.</p>;
  }
  return (
    <ol className="relative border-l border-gray-800 ml-3 space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="ml-4">
          <span
            className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-gray-950 ${ACTION_COLORS[log.action] ?? 'bg-gray-500'}`}
          />
          <p className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-gray-200">{log.action.replace(/_/g, ' ')}</p>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {Object.entries(log.metadata)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add admin/src/context/ admin/src/components/
git commit -m "feat: add admin shared components and auth context"
```

---

## Task 18: Admin pages + App router

**Files:**
- Create: `admin/src/App.tsx`
- Create: `admin/src/pages/Login.tsx`
- Create: `admin/src/pages/Dashboard.tsx`
- Create: `admin/src/pages/Users.tsx`
- Create: `admin/src/pages/UserDetail.tsx`
- Create: `admin/src/pages/Logs.tsx`

**Important:** Create all page files (Steps 2–7) before creating `App.tsx` (Step 1), since `App.tsx` imports them all. The steps are numbered for reference; execute in order 2→7 first, then do Step 1.

- [ ] **Step 1: Create `admin/src/App.tsx`** *(do this LAST, after Steps 2–7)*

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLayout } from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Logs from './pages/Logs';
import Resumes from './pages/Resumes';

const queryClient = new QueryClient();

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<AdminAuthGuard><Dashboard /></AdminAuthGuard>} />
            <Route path="/users" element={<AdminAuthGuard><Users /></AdminAuthGuard>} />
            <Route path="/users/:userId" element={<AdminAuthGuard><UserDetail /></AdminAuthGuard>} />
            <Route path="/resumes" element={<AdminAuthGuard><Resumes /></AdminAuthGuard>} />
            <Route path="/logs" element={<AdminAuthGuard><Logs /></AdminAuthGuard>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create `admin/src/pages/Login.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Login() {
  const { admin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');

  useEffect(() => {
    if (!loading && admin) navigate('/dashboard', { replace: true });
  }, [admin, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl text-center">
        <p className="text-xs text-gray-500 font-mono mb-1">ResumeAI</p>
        <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>
        {error === 'auth' && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-sm text-red-400">
            Access denied — your email is not authorized.
          </div>
        )}
        <a
          href="/api/admin/auth/google"
          className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3-11.3-7.7l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2C36.9 36.8 44 31 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `admin/src/pages/Dashboard.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { StatCard } from '../components/StatCard';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  if (isLoading) return <p className="text-gray-400">Loading stats...</p>;
  if (!stats) return <p className="text-red-400">Failed to load stats.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Unique Visitors" value={stats.uniqueVisitors} sub="distinct logins" />
        <StatCard label="Total Jobs" value={stats.totalJobs} />
        <StatCard label="Resumes Deleted" value={stats.resumesDeleted} />
      </div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Resumes</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Draft" value={stats.resumes.draft} />
        <StatCard label="Final" value={stats.resumes.final} />
        <StatCard label="Archived" value={stats.resumes.archived} />
        <StatCard label="Churn (Archived)" value={stats.resumesArchived} sub="archived events" />
      </div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">AI Usage</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Resume Tailors" value={stats.aiUsage.tailor} />
        <StatCard label="Cover Letters" value={stats.aiUsage.coverLetter} />
        <StatCard label="Interview Preps" value={stats.aiUsage.interviewPrep} />
        <StatCard label="Summary Gens" value={stats.aiUsage.summary} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `admin/src/pages/Users.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, UserSummary } from '../api/admin';
import { DataTable } from '../components/DataTable';
import { Search } from 'lucide-react';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined }),
  });

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (u: UserSummary) => (
        <Link to={`/users/${u.id}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
          {u.email}
        </Link>
      ),
    },
    { key: 'name', header: 'Name', render: (u: UserSummary) => u.displayName ?? '—' },
    {
      key: 'joined',
      header: 'Joined',
      render: (u: UserSummary) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (u: UserSummary) =>
        u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'Never',
    },
    { key: 'resumes', header: 'Resumes', render: (u: UserSummary) => u._count.resumes },
    { key: 'jobs', header: 'Jobs', render: (u: UserSummary) => u._count.jobApplications },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(inputValue);
                setPage(1);
              }
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageCount={data?.pageCount ?? 1}
          onPageChange={setPage}
          emptyMessage="No users found"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `admin/src/pages/UserDetail.tsx`**

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Trash2, ArrowLeft } from 'lucide-react';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmDeleteResume, setConfirmDeleteResume] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId,
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/users');
    },
  });

  const deleteResumeMutation = useMutation({
    mutationFn: (resumeId: string) => adminApi.deleteResume(resumeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data) return <p className="text-red-400">User not found.</p>;

  const { user, resumes, jobs, aiAmendmentCount, aiUsage, activityLog } = data;
  const profile = user.profile;

  return (
    <div className="max-w-4xl space-y-8">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Profile */}
      <section>
        <h1 className="text-2xl font-bold text-white">{profile ? `${profile.firstName} ${profile.lastName}` : user.displayName ?? user.email}</h1>
        <div className="mt-2 text-sm text-gray-400 space-y-1">
          <p>{user.email}</p>
          {profile?.location && <p>{profile.location}</p>}
          <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
          <p>Last active: {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</p>
        </div>
      </section>

      {/* AI Usage */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">AI Usage</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Tailors', aiUsage.tailor],
            ['Cover Letters', aiUsage.coverLetter],
            ['Interview Preps', aiUsage.interviewPrep],
            ['Summaries', aiUsage.summary],
          ].map(([label, count]) => (
            <div key={label as string} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">{aiAmendmentCount} total AI amendments</p>
      </section>

      {/* Resumes */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Resumes ({resumes.length})</h2>
        {resumes.length === 0 ? (
          <p className="text-sm text-gray-500">No resumes.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {['Title', 'Status', 'Template', 'Tailored For', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {resumes.map((r) => (
                  <tr key={r.id} className="bg-gray-950 hover:bg-gray-900">
                    <td className="px-4 py-3 text-gray-200">{r.title}</td>
                    <td className="px-4 py-3 text-gray-400">{r.status}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.templateId}</td>
                    <td className="px-4 py-3 text-gray-400">{r.tailoredFor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmDeleteResume(r.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Jobs */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Jobs ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No jobs.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {['Company', 'Title', 'Status', 'Applied'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {jobs.map((j) => (
                  <tr key={j.id} className="bg-gray-950 hover:bg-gray-900">
                    <td className="px-4 py-3 text-gray-200">{j.company}</td>
                    <td className="px-4 py-3 text-gray-400">{j.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-400">{j.status}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {j.appliedAt ? new Date(j.appliedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity log */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Activity Log</h2>
        <ActivityTimeline logs={activityLog} />
      </section>

      {/* Danger zone */}
      <section className="border border-red-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-400 mb-4">
          Permanently delete this user and all their data. This cannot be undone.
        </p>
        <button
          onClick={() => setConfirmDeleteUser(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Delete User
        </button>
      </section>

      <ConfirmDialog
        open={confirmDeleteUser}
        title="Delete User"
        message={`Permanently delete ${user.email} and all their data? This cannot be undone.`}
        confirmLabel="Delete User"
        onConfirm={() => { setConfirmDeleteUser(false); deleteUserMutation.mutate(); }}
        onCancel={() => setConfirmDeleteUser(false)}
        danger
      />
      <ConfirmDialog
        open={!!confirmDeleteResume}
        title="Delete Resume"
        message="Permanently delete this resume?"
        confirmLabel="Delete Resume"
        onConfirm={() => { if (confirmDeleteResume) deleteResumeMutation.mutate(confirmDeleteResume); setConfirmDeleteResume(null); }}
        onCancel={() => setConfirmDeleteResume(null)}
        danger
      />
    </div>
  );
}
```

- [ ] **Step 6: Create `admin/src/pages/Resumes.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, ResumeSummary } from '../api/admin';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['', 'DRAFT', 'FINAL', 'ARCHIVED'];

export default function Resumes() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-resumes', page, status],
    queryFn: () => adminApi.getResumes({ page, limit: 20, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-resumes'] }),
  });

  const columns = [
    { key: 'title', header: 'Title', render: (r: ResumeSummary) => r.title },
    { key: 'user', header: 'User', render: (r: ResumeSummary) => r.user.email },
    { key: 'status', header: 'Status', render: (r: ResumeSummary) => r.status },
    { key: 'template', header: 'Template', render: (r: ResumeSummary) => <span className="font-mono text-xs">{r.templateId}</span> },
    { key: 'tailored', header: 'Tailored For', render: (r: ResumeSummary) => r.tailoredFor ?? '—' },
    { key: 'created', header: 'Created', render: (r: ResumeSummary) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: (r: ResumeSummary) => (
        <button onClick={() => setConfirmDelete(r.id)} className="text-red-400 hover:text-red-300 transition-colors">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Resumes</h1>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageCount={data?.pageCount ?? 1}
          onPageChange={setPage}
          emptyMessage="No resumes found"
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Resume"
        message="Permanently delete this resume? This cannot be undone."
        confirmLabel="Delete Resume"
        onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  );
}
```

- [ ] **Step 7: Create `admin/src/pages/Logs.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, ActivityLogEntry } from '../api/admin';
import { DataTable } from '../components/DataTable';

const ACTION_OPTIONS = [
  '', 'LOGIN', 'LOGOUT', 'RESUME_CREATED', 'RESUME_DELETED', 'RESUME_ARCHIVED',
  'JOB_CREATED', 'JOB_DELETED', 'AI_TAILOR', 'AI_COVER_LETTER', 'AI_INTERVIEW_PREP',
  'AI_SUMMARY', 'PROFILE_UPDATED', 'ACCOUNT_DELETED', 'INTERVIEW_PREP_GENERATED',
];

export default function Logs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, action],
    queryFn: () => adminApi.getLogs({ page, limit: 50, action: action || undefined }),
  });

  const columns = [
    {
      key: 'time',
      header: 'Time',
      render: (l: ActivityLogEntry) => (
        <span className="font-mono text-xs">{new Date(l.createdAt).toLocaleString()}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (l: ActivityLogEntry) => l.user?.email ?? l.userId,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l: ActivityLogEntry) => (
        <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{l.action}</span>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (l: ActivityLogEntry) =>
        l.metadata && Object.keys(l.metadata).length > 0 ? (
          <span className="font-mono text-xs text-gray-500">
            {Object.entries(l.metadata)
              .slice(0, 3)
              .map(([k, v]) => `${k}:${String(v).slice(0, 20)}`)
              .join(' · ')}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Activity Logs</h1>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All Actions'}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageCount={data?.pageCount ?? 1}
          onPageChange={setPage}
          emptyMessage="No log entries found"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add admin/src/App.tsx admin/src/pages/
git commit -m "feat: add admin pages (login, dashboard, users, resumes, logs)"
```

---

## Task 19: Full integration test

- [ ] **Step 1: Start everything**

```bash
npm run dev
```

Expected: server on 3000, client on 5173, admin on 5174, no crashes.

- [ ] **Step 2: Test admin login**

Open `http://localhost:5174`. Should redirect to `/login`.

Click "Sign in with Google". Complete OAuth flow with your email (must be in `ADMIN_EMAILS`).

Expected: Redirected to `http://localhost:5174/dashboard`. Stats cards show real data.

- [ ] **Step 3: Test auth guard**

Open an incognito window and go to `http://localhost:5174/dashboard`.

Expected: Redirected to `/login`.

- [ ] **Step 4: Test users page**

Navigate to `/users`. Confirm user list loads with email, joined date, last active, counts.

Click a user row. Confirm detail page shows profile, resumes, jobs, AI usage, activity log.

- [ ] **Step 5: Test delete resume**

On a user detail page, click the trash icon next to a resume. Confirm dialog appears. Confirm delete. Resume should disappear from the list.

- [ ] **Step 6: Test delete user**

On a user detail page, click "Delete User" in the Danger Zone. Confirm. Should navigate back to `/users` and the user should be gone.

- [ ] **Step 7: Test logs page**

Navigate to `/logs`. Confirm log entries appear (LOGIN events should exist from your test login). Filter by `RESUME_DELETED` — should show the resume deletion from Step 5.

- [ ] **Step 8: Test activity logging on main app**

Open the main app at `http://localhost:5173`. Create a resume. Check the admin logs page — should see a `RESUME_CREATED` event.

- [ ] **Step 9: Verify lastActiveAt is being updated**

After logging into the main app and making a request, check the admin users list. The "Last Active" column for that user should show today's date.

- [ ] **Step 10: Commit (if any cleanup needed)**

```bash
git add -A
git commit -m "feat: admin panel complete — all pages and logging integrated"
```

---

## Task 20: Production deployment setup

- [ ] **Step 1: Add `admin` Vercel project**

In the Vercel dashboard, add a new project pointing to the same repo but with:
- Root directory: `admin`
- Build command: `npm run build`
- Output directory: `dist`
- Domain: `admin.resumeai.com`

- [ ] **Step 2: Update server production env vars**

In your server's Vercel/hosting env vars, add:
```
ADMIN_EMAILS=your-prod-email@gmail.com
ADMIN_SESSION_SECRET=<32+ char secret>
ADMIN_GOOGLE_CLIENT_ID=<prod admin google app client id>
ADMIN_GOOGLE_CLIENT_SECRET=<prod admin google app client secret>
ADMIN_GOOGLE_CALLBACK_URL=https://api.resumeai.com/api/admin/auth/google/callback
ADMIN_URL=https://admin.resumeai.com
```

- [ ] **Step 3: Update Google OAuth app**

In Google Cloud Console, add to your **admin** OAuth app's authorized redirect URIs:
```
https://api.resumeai.com/api/admin/auth/google/callback
```

- [ ] **Step 4: Deploy and smoke-test production**

Open `https://admin.resumeai.com`. Complete Google login. Verify dashboard loads with real data.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete admin panel — production deployment ready"
```
