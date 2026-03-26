# Admin CLAUDE.md

Internal admin panel. Vite + React 18 + TypeScript + TailwindCSS. Separate auth session from the main client.

## Commands

```bash
npm run dev:admin         # Start Vite dev server (port 5174, proxies /api → localhost:3000)
```

No test suite. No separate build script — admin is not included in the root `npm run build`.

## Entry Points

- `src/main.tsx` — React DOM mount
- `src/App.tsx` — Route tree with `AdminAuthGuard`

## Directory Structure

```
admin/src/
├── api/
│   ├── api.ts            # Axios instance: baseURL=/api, withCredentials: true
│   └── admin.ts          # All admin API calls (stats, users, resumes, logs, jobs)
├── context/
│   └── AdminAuthContext.tsx  # Fetches /api/admin/auth/me; provides useAdminAuth() → { admin, loading }
├── pages/
│   ├── Login.tsx         # Google/GitHub OAuth login (public)
│   ├── Dashboard.tsx     # Stats cards: total users, resumes, jobs, recent activity
│   ├── Users.tsx         # Paginated user list table
│   ├── UserDetail.tsx    # User profile, their resumes, job applications
│   ├── JobDetail.tsx     # Job details, output versions, AI amendments
│   ├── Logs.tsx          # ActivityLog table with filters
│   └── Resumes.tsx       # Resume list table
└── components/
    ├── AdminLayout.tsx        # Shell with top nav
    ├── AdminAuthContext.tsx   # (duplicate export — prefer context/AdminAuthContext.tsx)
    ├── ActivityTimeline.tsx   # Activity feed component
    ├── ConfirmDialog.tsx      # Reusable confirm modal
    ├── DataTable.tsx          # Generic sortable/filterable table
    └── StatCard.tsx           # Stats dashboard card
```

## Routing

```
/login           → Login (public)
/dashboard       → Dashboard (admin auth required)
/users           → Users list
/users/:userId   → UserDetail
/users/:userId/jobs/:jobId → JobDetail
/logs            → Logs
/resumes         → Resumes
```

All routes except `/login` are wrapped in `AdminAuthGuard` which checks `AdminAuthContext`.

## Auth

Admin uses a **completely separate session** from the main user app:
- Session cookie: `admin.sid` (vs user `connect.sid`)
- Session secret: `ADMIN_SESSION_SECRET` env var
- Protected by `requireAdmin` middleware on the server
- All admin API routes are under `/api/admin/*`

Never mix admin auth with user auth. `useAdminAuth()` is the only hook for admin identity.

## API Layer

All calls go through `src/api/admin.ts`. The functions available:

| Function | Route | Purpose |
|---|---|---|
| `getStats()` | `GET /api/admin/stats` | Aggregate counts |
| `getUsers()` | `GET /api/admin/users` | Paginated user list |
| `getUser(id)` | `GET /api/admin/users/:id` | User detail + profile |
| `getUserResumes(id)` | `GET /api/admin/resumes?userId=` | User's resumes |
| `getLogs()` | `GET /api/admin/logs` | Activity log |
| `getJobDetail(userId, jobId)` | `GET /api/admin/users/:id/jobs/:jobId` | Job + outputs |

## Key Patterns

- This is a **read-only** admin panel — no write/delete endpoints exist for admin
- `DataTable.tsx` is the primary display component; reuse it for new list views
- Use React Query for all data fetching (same `@tanstack/react-query` as client)
- Styling is minimal/functional — focus on data density over visual polish

## Environment Variables

The admin has no `.env.example`. The Vite proxy in `vite.config.ts` routes `/api` to `http://localhost:3000` — no server URL config needed locally.
