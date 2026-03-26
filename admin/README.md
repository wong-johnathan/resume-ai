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
