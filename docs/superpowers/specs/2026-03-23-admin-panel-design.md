# Admin Panel Design Spec

**Date:** 2026-03-23
**Feature:** ResumeAI Admin Panel
**Status:** Approved

---

## Goal

Build a fully isolated admin panel at `admin.resumeai.com` that lets admins monitor platform health, inspect and manage individual users and resumes, and view granular activity logs.

---

## Architecture

A new `admin/` NPM workspace is added to the monorepo alongside `client/` and `server/`. It is a Vite + React + TypeScript app mirroring the structure of `client/`, deployed as a separate Vercel project to `admin.resumeai.com`.

All data flows through new Express routes at `/api/admin/*`, protected by `requireAdmin` middleware. Admin authentication uses a dedicated Google OAuth Passport strategy named `'google-admin'` (distinct from the existing `'google'` user strategy). The strategy validates the authenticated email against the `ADMIN_EMAILS` environment variable (comma-separated) **server-side in the OAuth callback handler** — the frontend makes no access decisions. The check happens after user upsert; if the email is not in `ADMIN_EMAILS`, the server returns HTTP 403 and destroys the session.

Admin and user sessions are fully isolated:
- Two separate `express-session` middleware blocks are mounted on the app, one per session type.
- User sessions use cookie name `connect.sid` and `SESSION_SECRET`.
- Admin sessions use cookie name `admin.sid` and `ADMIN_SESSION_SECRET`.
- Both use the same pg session store (different rows, different cookie names).

```typescript
// User sessions (existing)
app.use(session({ name: 'connect.sid', secret: env.SESSION_SECRET, ... }));

// Admin sessions (new, mounted before /api/admin routes only)
app.use('/api/admin', session({ name: 'admin.sid', secret: env.ADMIN_SESSION_SECRET, ... }));
```

The `deserializeUser` callbacks discriminate by checking a `type: 'user' | 'admin'` field stored in `session.passport.user`. The `'google-admin'` strategy serializes `{ type: 'admin', id }` and deserializes from `AdminUser`; the existing strategy serializes `{ type: 'user', id }` and deserializes from `User`.

The admin app proxies `/api` → `http://localhost:3000` in dev. A new `dev:admin` npm script runs it on port 5174.

---

## Monorepo Integration

The root `package.json` `workspaces` array is updated to include `"admin"`:
```json
"workspaces": ["client", "server", "admin"]
```

The root `package.json` scripts are updated:
```json
"dev:admin": "npm run dev --workspace=admin",
"dev": "concurrently \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:admin\" \"npm run dev:landing\""
```

The CORS middleware in `server/src/app.ts` is updated to allow both the client and admin origins:
```typescript
const allowedOrigins = [env.CLIENT_URL];
if (env.ADMIN_URL) allowedOrigins.push(env.ADMIN_URL);
app.use(cors({ origin: allowedOrigins, credentials: true }));
```

---

## Data Model Changes

### New: `AdminUser` table

```prisma
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

A separate Google OAuth app (client ID + secret) is used for admin auth to fully decouple it from the user-facing OAuth app.

### New: `ActivityLog` table

```prisma
model ActivityLog {
  id        String          @id @default(cuid())
  userId    String          // Non-nullable but NOT a FK — logs persist after user deletion
  action    ActivityAction
  metadata  Json?
  createdAt DateTime        @default(now())
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

**Metadata schemas per event:**

| Action | Metadata fields |
|--------|----------------|
| `RESUME_CREATED` | `{ resumeId, title, templateId }` |
| `RESUME_DELETED` | `{ resumeId, title, templateId, status, createdAt }` — snapshot before delete |
| `RESUME_ARCHIVED` | `{ resumeId, title }` |
| `JOB_CREATED` | `{ jobId, company, jobTitle }` |
| `JOB_DELETED` | `{ jobId, company, jobTitle }` |
| `AI_TAILOR` | `{ jobId, resumeId }` |
| `AI_COVER_LETTER` | `{ jobId }` |
| `AI_INTERVIEW_PREP` | `{ jobId }` |
| `AI_SUMMARY` | `{}` |
| `ACCOUNT_DELETED` | `{ userId, email, displayName, createdAt }` — snapshot before delete |
| All others | `{}` |

### Modified: `User` table

Add `lastActiveAt DateTime?`. Updated by `updateLastActive` middleware — see below.

---

## Activity Logging Strategy

A `logActivity(userId: string, action: ActivityAction, metadata?: object): Promise<void>` helper is added to `server/src/services/activityLog.ts`. It writes to `ActivityLog` via Prisma. All calls are fire-and-forget with caught+swallowed errors so logging failures never break user-facing requests.

**Where logging happens:**
- **LOGIN** — in the `'google-admin'`/`'google'` OAuth callback, immediately after successful user upsert (not in `serializeUser`).
- **LOGOUT** — in the logout route handler, before session destroy.
- **ACCOUNT_DELETED** — in `DELETE /api/auth/account` and `DELETE /api/admin/users/:userId`, **before** the user delete call (so the log exists before cascade wipes related rows).
- **RESUME_DELETED** — in the resume delete handler, before the delete call, with snapshot metadata.
- **RESUME_ARCHIVED** — in the resume update handler when `status` changes to `ARCHIVED`.
- All other events — in their respective route handlers at the point of the action.

**Cascade note:** When an admin deletes a user, Prisma cascade deletes all related resumes, jobs, amendments, etc. Only one `ACCOUNT_DELETED` log entry is created (with a user snapshot). Individual `RESUME_DELETED` logs are not created for the cascading deletes — the `ACCOUNT_DELETED` entry is the audit record.

### `updateLastActive` middleware

Updates `User.lastActiveAt` on authenticated requests, **throttled to once per hour per user** to avoid excessive DB writes. The middleware checks the current `lastActiveAt` value; if it was updated less than 1 hour ago, it skips the write. Applied to all routes that use `requireAuth`.

---

## Admin API Routes

All routes are under `/api/admin/*` and protected by `requireAdmin` middleware. The admin session middleware is mounted only on the `/api/admin` path prefix to avoid touching user sessions.

### Pagination convention

All list endpoints accept `?page=1&limit=20` query params. Responses follow:
```json
{ "data": [...], "total": 150, "page": 1, "pageCount": 8 }
```

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/auth/google` | Initiate Google OAuth for admin (uses `'google-admin'` strategy) |
| `GET` | `/api/admin/auth/google/callback` | OAuth callback — validates email against `ADMIN_EMAILS` server-side; returns 403 if not allowed |
| `GET` | `/api/admin/auth/me` | Return current admin session |
| `POST` | `/api/admin/auth/logout` | Destroy admin session |

### Dashboard Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/stats` | Returns: total registered users, total resumes by status (draft/final/archived), deleted resume count (from `ActivityLog`), AI usage counts by type (tailor/cover-letter/interview-prep/summary), total jobs |

**Unique visitors** = `SELECT COUNT(DISTINCT userId) FROM ActivityLog WHERE action = 'LOGIN'`. This is a simple count query, sufficient at current scale. Returned as `uniqueVisitors` in the stats response.

**Resume churn** = count of `RESUME_DELETED` events + count of `RESUME_ARCHIVED` events, returned as separate fields: `resumesDeleted` and `resumesArchived`.

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users?page=1&limit=20&search=email` | Paginated user list: email, displayName, createdAt, lastActiveAt, resume count, job count |
| `GET` | `/api/admin/users/:userId` | Full user detail: profile, resumes, jobs, AI amendment count, activity log (all events for this user) |
| `DELETE` | `/api/admin/users/:userId` | Log `ACCOUNT_DELETED` with snapshot **first**, then hard delete (Prisma cascade handles relations) |

### Resumes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/resumes?page=1&limit=20&status=DRAFT` | Paginated resume list across all users, filterable by `status` |
| `DELETE` | `/api/admin/resumes/:resumeId` | Log `RESUME_DELETED` with snapshot **first**, then hard delete |

### Activity Logs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/logs?page=1&limit=50&userId=x&action=LOGIN` | Paginated log entries, filterable by `userId` and/or `action`, sorted by `createdAt` desc |

---

## Admin Frontend Pages

The `admin/` app has five pages, all behind an `<AdminAuthGuard>` that redirects unauthenticated visitors to `/login`.

### `/login`
Google OAuth sign-in button. Calls `GET /api/admin/auth/google`. On success, redirects to `/dashboard`. If the server returns 403, displays "Access denied — your email is not authorized."

### `/dashboard`
Stat cards:
- Total registered users
- Total resumes (draft / final / archived — three cards or grouped)
- Deleted resumes (from `ActivityLog`)
- Unique visitors (distinct users with at least one LOGIN event)
- AI usage: tailor count, cover letter count, interview prep count, summary count
- Total jobs tracked

No charts — number cards only.

### `/users`
Paginated table: email, display name, joined date, last active, resume count, job count. Rows link to `/users/:userId`. Search input filters by email (`?search=`).

### `/users/:userId`
Full user detail with sections:
1. **Profile summary** — name, email, location, joined date, last active
2. **Resumes** — table (title, status, created, tailored-for) with per-row delete button (confirmation required)
3. **Jobs** — table (company, title, status, applied date)
4. **AI usage** — counts for tailor, cover letter, interview prep, summary
5. **Activity log** — timeline of all events for this user, newest first
6. **Danger zone** — "Delete User" button behind a confirmation dialog

### `/logs`
Global activity log table: timestamp, user email, action type, metadata summary. Filterable by action type via dropdown. Paginated, newest-first.

---

## Server File Structure

```
server/src/
  config/
    passport.ts           # modified: add 'google-admin' strategy + discriminated deserializeUser
  middleware/
    requireAdmin.ts       # new: checks req.user is AdminUser (type: 'admin')
    updateLastActive.ts   # new: throttled lastActiveAt update (max once/hour per user)
  routes/
    admin/
      index.ts            # new: mounts admin session middleware + all admin sub-routers
      auth.ts             # new: admin Google OAuth routes
      stats.ts            # new: aggregate stats endpoint
      users.ts            # new: user list, detail, delete
      resumes.ts          # new: resume list, delete
      logs.ts             # new: activity log query
  services/
    activityLog.ts        # new: logActivity() helper
  app.ts                  # modified: mount /api/admin router, add ADMIN_URL to CORS, add updateLastActive
```

---

## Admin Workspace File Structure

```
admin/
  package.json
  vite.config.ts          # proxy /api → localhost:3000; port 5174
  tsconfig.json
  index.html
  src/
    main.tsx
    App.tsx               # router setup, AdminAuthGuard
    api/
      api.ts              # axios instance (withCredentials: true)
      admin.ts            # typed wrappers per endpoint
    pages/
      Login.tsx
      Dashboard.tsx
      Users.tsx
      UserDetail.tsx
      Logs.tsx
    components/
      StatCard.tsx
      DataTable.tsx
      ConfirmDialog.tsx
      ActivityTimeline.tsx
      AdminLayout.tsx
```

---

## Environment Variables

### `server/.env` additions

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAILS` | Comma-separated Google emails allowed as admins (e.g. `you@gmail.com`) |
| `ADMIN_SESSION_SECRET` | Separate session secret for admin sessions (32+ chars) |
| `ADMIN_GOOGLE_CLIENT_ID` | Google OAuth client ID for the admin app |
| `ADMIN_GOOGLE_CLIENT_SECRET` | Google OAuth client secret for the admin app |
| `ADMIN_GOOGLE_CALLBACK_URL` | e.g. `https://admin.resumeai.com/api/admin/auth/google/callback` |
| `ADMIN_URL` | Admin frontend origin for CORS (e.g. `https://admin.resumeai.com`) |

---

## Security Summary

- `requireAdmin` middleware is applied at the router level — every `/api/admin/*` route is protected, no per-route decoration needed.
- Admin and user sessions are fully isolated: separate secrets, separate cookie names, separate session middleware scope, discriminated `deserializeUser`.
- `ADMIN_EMAILS` check is server-side only in the OAuth callback — never the frontend.
- Separate Google OAuth app credentials for admin vs user login.
- Admin delete operations write an `ActivityLog` entry **before** the delete to guarantee an audit trail even if the delete fails.
- `ActivityLog` has no FK to `User` — logs persist after user deletion.
