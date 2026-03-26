# TOS & Privacy Policy — Design Spec

**Date:** 2026-03-26
**Scope:** Landing page (`landing/`) only — static Next.js export on Vercel.

---

## Overview

Add Terms of Service (`/terms`) and Privacy Policy (`/privacy`) as two new static pages on the landing site. Both pages share a reusable `LegalLayout` component with a minimal header. Content is real and specific to ResumeAI. Footer gains links to both pages.

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `landing/components/LegalLayout.tsx` | Shared minimal chrome: logo (links to `/`), "← Back to home" link, light-themed content wrapper |
| `landing/app/terms/page.tsx` | Terms of Service page — uses `LegalLayout`, contains full TOS content |
| `landing/app/privacy/page.tsx` | Privacy Policy page — uses `LegalLayout`, contains full Privacy Policy content |

### Modified files

| File | Change |
|---|---|
| `landing/components/Footer.tsx` | Add "Terms" link to `/terms` and "Privacy" link to `/privacy` alongside existing "Go to app" link |

---

## Visual Design

### LegalLayout

- **Background:** white (`bg-white`) full page
- **Minimal header:** white bar with `border-b border-gray-200`, contains:
  - Left: "ResumeAI" in bold dark text (`text-gray-900 font-bold`) — links to `/`
  - Right: "← Back to home" in blue (`text-blue-600`) — links to `/`
- **Content area:** `max-w-2xl mx-auto px-6 py-12`
- **No Navbar, no Footer** — legal pages are self-contained

### Page content structure

Each page renders inside `LegalLayout` with:
- **Label:** small uppercase gray label — "Legal"
- **Title:** large bold heading — "Terms of Service" or "Privacy Policy"
- **Last updated date:** small gray text
- **Divider** below title block
- **Sections:** each section has:
  - Section heading: small uppercase blue (`text-blue-700`), bold
  - Body: `text-gray-700` at readable line-height
- **Cross-link** at bottom: TOS links to Privacy Policy, Privacy links to TOS

### Footer update

Add two new links (gray, `text-gray-400 hover:text-gray-300`) between the copyright and "Go to app":
- "Terms" → `/terms`
- "Privacy" → `/privacy`

---

## Content Outline

### Terms of Service (`/terms`)

1. **Acceptance of Terms** — using the service means accepting these terms
2. **What ResumeAI Does** — AI resume builder, tailoring, cover letters, interview prep, job tracker
3. **Your Account** — Google OAuth only; no password stored; user responsible for account activity
4. **AI-Generated Content** — outputs are suggestions, not guaranteed accurate; user reviews before submitting
5. **Acceptable Use** — no abuse, scraping, or misuse of AI features; rate limits apply (10 req/15 min)
6. **Intellectual Property** — user owns their resume content; ResumeAI owns the platform
7. **Service Availability** — provided as-is, no uptime guarantee; we may modify or discontinue
8. **Termination** — we may suspend accounts for ToS violations
9. **Limitation of Liability** — not liable for job application outcomes
10. **Changes to Terms** — we'll update the "last updated" date; continued use = acceptance
11. **Contact** — how to reach us

### Privacy Policy (`/privacy`)

1. **Information We Collect** — Google profile (name, email, avatar via OAuth), resume content (work history, education, skills), job applications, cover letters, AI-generated content, usage/activity logs
2. **How We Use Your Data** — to provide the service (AI tailoring, PDF generation, job tracking); not sold to third parties
3. **AI Processing** — resume and job description content is sent to Claude (Anthropic) to generate tailored content; no data is used to train models
4. **Google OAuth** — we receive basic profile info from Google; we don't access Gmail, Drive, or other Google services
5. **Data Storage** — stored in PostgreSQL on Railway; sessions stored server-side
6. **Data Retention** — data kept as long as account is active; you can request deletion
7. **Cookies & Sessions** — session cookie (`connect.sid`) for authentication; no tracking cookies
8. **Third-Party Services** — Anthropic (AI), Railway (hosting), Vercel (landing page)
9. **Your Rights** — access, correct, or delete your data; contact us to exercise rights
10. **Children's Privacy** — not intended for users under 13
11. **Changes to Policy** — "last updated" date reflects latest version
12. **Contact** — how to reach us

---

## Routing & SEO

- Pages are static — no `getServerSideProps`, no API calls
- Each page exports a `metadata` object with title and description for SEO
- Update `landing/app/sitemap.ts` to include `/terms` and `/privacy`
- No changes to `robots.ts` needed (public pages, indexable)

---

## Constraints

- Static export (`output: 'export'`) — no dynamic features
- `next/link` for all internal links (not `<a>`)
- No `next/image` optimization (incompatible with static export) — no images on legal pages anyway
- Framer Motion not needed — legal pages are static content, no entrance animations
