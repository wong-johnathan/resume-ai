# ResumeAI Landing Page Design Spec

## Overview

A standalone Next.js marketing site deployed at `landing-resume-ai.johnathanwwh.com`. All CTAs link to the app at `https://resume-ai.johnathanwwh.com`. The page is statically exported for maximum SEO performance and serves as the primary entry point for new users discovering ResumeAI.

---

## Goals

- Entice job seekers to sign up for ResumeAI
- Communicate all major features clearly
- Rank well in search engines (SEO-optimized)
- Retain the same color scheme as the app
- Deploy independently from the React client app

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Static export, SEO-friendly, file-based routing |
| Styling | Tailwind CSS v4 | Matches existing app approach |
| Animation | Framer Motion | Scroll-triggered reveals, hero entrance |
| Font | Inter via `next/font` | Clean, professional |
| SEO | Native Next.js Metadata API | OG tags, Twitter cards, canonical URL, sitemap |
| Deployment | Vercel (recommended) | Static export, custom domain support |

---

## Color Tokens

Matches the existing ResumeAI app palette exactly:

| Token | Value | Usage |
|---|---|---|
| `--brand-blue` | `#3b82f6` | CTAs, active accents, glows |
| `--bg-dark` | `#111827` | Hero, navbar backgrounds |
| `--bg-white` | `#ffffff` | Feature/content section backgrounds |
| `--bg-gray` | `#f3f4f6` | Alternating section backgrounds |
| `--text-muted` | `#6b7280` | Subtext, captions |
| Purple accent | `#8b5cf6` | Hero blob, Why section accent |
| Green accent | `#22c55e` | How It Works step 3 accent |

---

## Project Structure

```
landing/                          # new Next.js app, monorepo root
  app/
    layout.tsx                    # root layout: font, metadata, globals
    page.tsx                      # home page — composes all section components
    globals.css                   # Tailwind base + CSS custom properties
    sitemap.ts                    # auto-generated sitemap for SEO
    robots.ts                     # robots.txt for SEO
  components/
    Navbar.tsx                    # logo left, CTA button right
    Hero.tsx                      # dark hero with headline, subheadline, CTA, blobs
    WhySection.tsx                # 3 pain-point → solution cards
    FeaturesSection.tsx           # bento grid of 6 feature cards
    HowItWorks.tsx                # 3-step numbered horizontal flow
    TemplatesSection.tsx          # abstract template style preview grid
    Footer.tsx                    # logo, copyright, app link
  package.json
  next.config.ts                  # output: 'export' for static generation
  tailwind.config.ts
  tsconfig.json
```

---

## SEO Configuration

**Page metadata (in `app/layout.tsx`):**
- `title`: `ResumeAI — Build Resumes That Actually Get Interviews`
- `description`: `AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.`
- `canonical`: `https://landing-resume-ai.johnathanwwh.com`
- Open Graph: title, description, type=website, image (1200×630 branded card)
- Twitter card: `summary_large_image`
- `sitemap.ts`: single entry for `/`
- `robots.ts`: allow all, sitemap reference

**Semantic HTML:**
- Single `<h1>` in Hero
- Section headings use `<h2>`
- Feature card headings use `<h3>`
- Landmark roles: `<header>`, `<main>`, `<footer>`, `<section>`

---

## Page Sections

### 1. Navbar

- Background: `#111827` (dark), sticky
- Left: `ResumeAI` wordmark in white, bold
- Right: `Get Started →` button — blue (`#3b82f6`), rounded, links to `https://resume-ai.johnathanwwh.com`
- On mobile: same layout, button shrinks to icon-only or abbreviates

---

### 2. Hero

**Visual style:**
- Full-width dark section (`#111827`)
- Abstract glowing blobs: one blue (`#3b82f6`, 40% opacity), one purple (`#8b5cf6`, 30% opacity) — positioned behind headline text using absolute positioning and blur
- Subtle animated pulse on blobs via Framer Motion (`animate={{ scale: [1, 1.05, 1] }}`, 6s loop)
- Entrance animation: headline and subheadline fade + slide up on mount

**Content:**
- Badge above headline: small pill `✦ AI-Powered Job Search`
- `<h1>`: *"Build resumes that **actually get interviews**"* — "actually get interviews" in blue gradient text
- Subheadline: *"AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place."*
- CTA button: `Get Started Free →` — prominent blue, large, links to `https://resume-ai.johnathanwwh.com`
- Secondary link below CTA: `See how it works ↓` — scrolls to HowItWorks section

---

### 3. Why ResumeAI

**Visual style:**
- White background
- 3-column card grid (stacks to 1 column on mobile)
- Each card: light gray border, white fill, icon top-left, pain point headline, solution body

**Content — 3 cards:**

| Icon | Pain Point Headline | Solution Body |
|---|---|---|
| 📄 | *Generic resumes get ignored* | Most resumes never make it past the first filter. ResumeAI rewrites yours to match every job description — keywords, tone, and all. |
| 📋 | *Job hunting feels like chaos* | Applications scattered across tabs, emails, and spreadsheets. ResumeAI keeps every role, status, and document in one organized tracker. |
| 🎤 | *Interviews catch you off guard* | ResumeAI generates tailored interview questions for each role and gives you AI feedback on your practice answers. |

---

### 4. Features Section

**Visual style:**
- Light gray background (`#f3f4f6`)
- Section heading: `<h2>` — "Everything you need to land the job"
- Bento grid layout: 2 large cards (top row) + 4 smaller cards (bottom 2×2)
- Each card: white background, rounded-xl, subtle shadow, icon, title (`<h3>`), 1–2 sentence description

**6 Feature Cards:**

| Size | Feature | Description |
|---|---|---|
| Large | AI Resume Tailoring | Paste any job description and AI rewrites your entire resume to match — reordering, reframing, and optimizing for the role. |
| Large | Job Tracker | Track every application with status, dates, salary, location, and attachments in a clean table view. |
| Small | Interview Prep | AI generates role-specific interview questions by category. Practice your answers and get feedback. |
| Small | Cover Letter Generator | Generate a tailored cover letter in Professional, Conversational, or Enthusiastic tone — streamed in real time. |
| Small | Fit Analysis | Get an AI match score and breakdown of your strengths and gaps before you apply. |
| Small | 20 Resume Templates | Choose from 20 professional templates and download a print-ready PDF instantly. |

---

### 5. How It Works

**Visual style:**
- White background
- Section heading: `<h2>` — "Get started in minutes"
- Horizontal 3-step flow on desktop (vertical stack on mobile)
- Steps connected by dashed line with arrow on desktop
- Each step: large step number (blue, outlined), icon, bold title, short description

**3 Steps:**

1. **Build your profile once** — Enter your experience, skills, education, and summary. Import from an existing PDF resume to auto-fill everything.
2. **Paste a job description** — AI tailors your resume to the role in seconds. Generate a cover letter and check your fit score before applying.
3. **Track, prep, and apply** — Log your application, generate interview questions, practice your answers, and stay organized until you land the offer.

---

### 6. Templates Preview

**Visual style:**
- Light gray background
- Section heading: `<h2>` — "20 professional templates"
- Subheading: *"Pick the style that fits your industry. Download as a polished PDF in seconds."*
- Horizontal scrolling row of 6 abstract template cards (representing different styles)
- Each card: styled rectangle (~A4 ratio) with abstract line patterns suggesting resume layout — no real content
- Color variations: white, dark/charcoal, teal, coral, slate-blue, soft-cream — matching template name palette
- Hover: subtle lift shadow

---

### 7. Footer

- Dark background (`#111827`)
- Left: `ResumeAI` wordmark + `© 2026 ResumeAI. All rights reserved.`
- Right: `Go to app →` link to `https://resume-ai.johnathanwwh.com`
- Single row, minimal

---

## Animation Strategy (Framer Motion)

| Element | Animation |
|---|---|
| Hero headline + subheadline | Fade + slide up on mount, staggered 0.15s |
| Hero blobs | Slow scale pulse loop (6s) |
| Why/Features/HowItWorks cards | Fade + slide up on scroll enter (`whileInView`) |
| Template cards | Fade in on scroll, staggered |
| CTA buttons | Scale on hover (`whileHover={{ scale: 1.03 }}`) |

All animations respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()`.

---

## Responsive Breakpoints

| Section | Mobile | Desktop |
|---|---|---|
| Navbar | Logo + CTA button | Same |
| Hero | Single column, blobs scale down | Centered, full-width blobs |
| Why ResumeAI | 1-column stack | 3-column grid |
| Features | 1-column stack | Bento grid (2 large + 2×2) |
| How It Works | Vertical stack | Horizontal 3-step row |
| Templates | Horizontal scroll | Static row |
| Footer | Stacked | Single row |

---

## Out of Scope

- No login/auth flow on the landing page itself (all CTAs link to the app)
- No blog, changelog, or docs pages
- No pricing page (app is free)
- No dark/light mode toggle
- No CMS integration
