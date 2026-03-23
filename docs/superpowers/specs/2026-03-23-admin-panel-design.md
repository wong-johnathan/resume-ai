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

All data flows through new Express routes at `/api/admin/*`, protected by `requireAdmin` middleware. Admin authentication uses a dedicated Google OAuth Passport strategy that validates the authenticated email against the `ADMIN_EMAILS` environment variable (comma-separated). Admin sessions are stored in the existing pg session store but use a separate cookie name (`admin.sid`) to avoid colliding with regular user sessions.

In development, `admin/` proxies `/api` → `http://localhost:3000`, matching the pattern used by `client/`. A new `dev:admin` npm script runs the admin app on port 5174.

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

### New: `ActivityLog` table

```prisma
model ActivityLog {
  id        String          @id @default(cuid())
  userId    String
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

`metadata` is a freeform JSON blob providing context (e.g. `{ resumeId, title, templateId }` for resume events). For deletion events, a snapshot of key fields is stored so the record persists after the row is gone.

Note: `ActivityLog` does not have a foreign key relation to `User` — this allows logs to persist after a user is deleted (`ACCOUNT_DELETED` events included).

### Modified: `User` table

Add `lastActiveAt DateTime?` — updated by a lightweight `updateLastActive` middleware applied to all authenticated routes. This gives per-user "last seen" data without building a full session-tracking system.

---

## Admin API Routes

All routes are under `/api/admin/*` and protected by `requireAdmin` middleware, which checks that `req.user` is an authenticated `AdminUser`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/auth/google` | Initiate Google OAuth for admin |
| `GET` | `/api/admin/auth/google/callback` | OAuth callback — validates email against `ADMIN_EMAILS` |
| `GET` | `/api/admin/auth/me` | Return current admin session |
| `POST` | `/api/admin/auth/logout` | Destroy admin session |

### Dashboard Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/stats` | Aggregate counts: total users, total resumes, archived resumes, deleted resumes (from log), AI usage by type, total jobs |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Paginated user list with email, displayName, createdAt, lastActiveAt, resume count, job count |
| `GET` | `/api/admin/users/:userId` | Full user detail: profile, resumes, jobs, AI amendment count, activity log |
| `DELETE` | `/api/admin/users/:userId` | Hard delete user (Prisma cascade handles relations), writes `ACCOUNT_DELETED` log entry |

### Resumes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/resumes` | Paginated resume list across all users, filterable by status |
| `DELETE` | `/api/admin/resumes/:resumeId` | Hard delete resume, writes `RESUME_DELETED` log entry with snapshot |

### Activity Logs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/logs` | Paginated log entries, filterable by `userId` and/or `action`, sorted by `createdAt` desc |

---

## Admin Frontend Pages

The `admin/` app has five pages, all behind an auth guard that redirects unauthenticated visitors to `/login`.

### `/login`
Google OAuth sign-in button. On success, redirects to `/dashboard`. If the authenticated email is not in `ADMIN_EMAILS`, displays "Access denied" and destroys the session.

### `/dashboard`
Top-level stat cards displaying:
- Total registered users
- Total resumes (by status: draft / final / archived)
- Deleted resumes (from activity log count)
- AI usage breakdown: tailor count, cover letter count, interview prep count, summary count
- Total jobs tracked

No charts — number cards only for the initial version.

### `/users`
Paginated table with columns: email, display name, joined date, last active, resume count, job count. Each row links to `/users/:userId`. Includes a search input filtered by email.

### `/users/:userId`
Full user detail view with four sections:
1. **Profile summary** — name, email, location, joined date, last active
2. **Resumes** — table with title, status, created date, tailored-for field; each row has a delete button
3. **Jobs** — table with company, title, status, applied date
4. **AI usage** — counts for tailor, cover letter, interview prep, summary
5. **Activity log** — timeline of all events for this user, newest first
6. **Danger zone** — "Delete User" button behind a confirmation dialog

### `/logs`
Global activity log table: timestamp, user email, action type, metadata summary. Filterable by action type via a dropdown. Paginated with newest-first default sort.

---

## Activity Logging Strategy

A `logActivity(userId, action, metadata?)` helper function is added to `server/src/services/activityLog.ts`. It writes to `ActivityLog` via Prisma. It is called:

- In existing route handlers at the point of the meaningful action (not in middleware)
- For auth events: in the Passport `serializeUser` callback (LOGIN) and the logout route (LOGOUT)
- For AI events: in each AI route handler after a successful response
- For resume/job CRUD: in the respective route handlers

This is fire-and-forget inside each handler — errors are caught and swallowed so a logging failure never breaks the user-facing request.

---

## Server File Structure

```
server/src/
  config/
    passport.ts           # modified: add admin Google strategy
  middleware/
    requireAdmin.ts       # new: checks req.user is AdminUser
    updateLastActive.ts   # new: updates User.lastActiveAt on auth'd requests
  routes/
    admin/
      auth.ts             # new: admin Google OAuth + session routes
      stats.ts            # new: aggregate stats endpoint
      users.ts            # new: user list, detail, delete
      resumes.ts          # new: resume list, delete
      logs.ts             # new: activity log query
  services/
    activityLog.ts        # new: logActivity() helper
  app.ts                  # modified: mount /api/admin router, add updateLastActive middleware
```

---

## Admin Workspace File Structure

```
admin/
  package.json
  vite.config.ts          # proxy /api → localhost:3000
  tsconfig.json
  index.html
  src/
    main.tsx
    App.tsx               # router setup, auth guard
    api/
      api.ts              # axios instance
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

New vars added to `server/.env`:
- `ADMIN_EMAILS` — comma-separated list of Google emails allowed as admins (e.g. `you@gmail.com,colleague@gmail.com`)
- `ADMIN_SESSION_SECRET` — separate session secret for admin sessions (32+ char)

---

## Security Considerations

- `requireAdmin` middleware is applied at the router level — every `/api/admin/*` route is protected, no per-route decoration needed
- Admin and user sessions use different cookie names (`admin.sid` vs `connect.sid`) and different session secrets to prevent session confusion
- `ADMIN_EMAILS` check happens server-side in the OAuth callback — the frontend never makes this determination
- Admin delete operations on users/resumes write an `ActivityLog` entry before the delete so there is always an audit trail
