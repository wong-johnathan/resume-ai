# README Files Design

**Date:** 2026-03-26
**Branch:** feature/claude-md-docs

## Goal

Create README.md files for each sub-app in the monorepo (`server/`, `client/`, `admin/`, `landing/`) and update the root `README.md` to reflect the full 4-package structure. Audience: both developers/contributors and public/open-source readers. Each README is self-contained but also links to the root for shared context.

---

## Root `README.md` (update)

Extend existing content — do not rewrite from scratch.

**Changes:**
- Update monorepo structure diagram to include `admin/` and `landing/`
- Add `admin/` and `landing/` to the tech stack table
- Add `dev:admin` and `dev:landing` to the development commands section
- Add a **Packages** section: one-liner per package + link to its sub-README
- Update deployment section to mention `landing/` deploys separately to Vercel as a static site

Everything else (features list, API reference, hosting diagram, free tier table) stays as-is.

---

## `server/README.md` (new — full depth)

| Section | Content |
|---|---|
| Overview | Express API, all `/api` routes, Prisma + PostgreSQL |
| Tech stack | Express, TypeScript, Prisma 5, Passport.js, OpenAI SDK (Claude), Puppeteer, Zod |
| Getting started | Prerequisites, env var table (all vars), `npm run dev:server` |
| Architecture | Annotated directory tree: routes/, services/, middleware/, config/ |
| API reference | Full endpoint table — auth, profile, resumes, jobs, job-statuses, ai, templates, interview-prep, tours, admin/* |
| Database | Model summary table, two-URL connection pattern (pooled 6543 / direct 5432) |
| Auth | User session (connect.sid) vs admin session (admin.sid) explained |
| AI service | Features table, rate limits, SSE note for cover letter, clone-not-mutate note for tailoring |

---

## `client/README.md` (new — medium depth)

| Section | Content |
|---|---|
| Overview | Main user-facing SPA, what it enables |
| Tech stack | Vite, React 18, TypeScript, React Router v7, TanStack Query, Zustand, TipTap, TailwindCSS |
| Getting started | Prerequisites, env note (no secrets needed), `npm run dev:client` |
| Routes | Table of all routes with descriptions and auth/profile requirements |
| Architecture | Annotated directory tree: api/, components/, context/, pages/, store/, tours/ |
| Key patterns | useAuth, React Query for server state, Zustand for UI state, API layer convention, RHF+Zod forms, toasts |
| Tours | 3 onboarding tours, tour IDs, how completion is tracked server-side |

---

## `admin/README.md` (new — brief)

| Section | Content |
|---|---|
| Overview | Internal read-only admin panel, not public-facing |
| Tech stack | Vite, React 18, TypeScript, TanStack Query, TailwindCSS |
| Getting started | No .env needed locally, `npm run dev:admin`, how to obtain admin access |
| Routes | Short table: Dashboard, Users, User Detail, Job Detail, Logs |
| Auth | Separate admin.sid session vs user connect.sid, how admin accounts are provisioned |
| Architecture | Brief annotated directory tree |

---

## `landing/README.md` (replace boilerplate — minimal)

| Section | Content |
|---|---|
| Overview | Static marketing site, what it is |
| Tech stack | Next.js App Router, React 19, TypeScript, Framer Motion, TailwindCSS |
| Getting started | `npm run dev:landing` (port 3001), `npm run build` → static export to `out/` |
| Structure | Component list with one-liner per component |
| Deployment | Static export → Vercel, vercel.json configured, no env vars needed |
| Adding a section | 3-step guide: create component, add to page.tsx, use Framer Motion entrance |

---

## Constraints

- Do not rewrite the root README from scratch — update only the identified sections
- Replace `landing/README.md` boilerplate entirely
- All files written in the `feature/claude-md-docs` worktree
- No test suite — nothing to document there
