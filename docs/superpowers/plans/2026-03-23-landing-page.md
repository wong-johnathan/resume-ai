# ResumeAI Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js 15+ marketing landing page at `landing/` that entices job seekers to sign up for ResumeAI.

**Architecture:** Static Next.js 15+ App Router site (`output: 'export'`) deployed independently at `landing-resume-ai.johnathanwwh.com`. All CTAs link to the app at `https://resume-ai.johnathanwwh.com`. Seven section components (Navbar, Hero, WhySection, FeaturesSection, HowItWorks, TemplatesSection, Footer) composed in `page.tsx`. Animated with Framer Motion, styled with Tailwind CSS v3.

**Tech Stack:** Next.js 15+, Tailwind CSS v3, Framer Motion, `next/font` (Inter)

---

## File Map

| File | Type | Responsibility |
|---|---|---|
| `landing/next.config.ts` | Config | Static export + `images.unoptimized` |
| `landing/tailwind.config.ts` | Config | Content paths for Tailwind v3 |
| `landing/app/globals.css` | Style | Tailwind base directives + `scroll-behavior: smooth` |
| `landing/app/layout.tsx` | Server | Root layout, Inter font, full SEO metadata |
| `landing/app/page.tsx` | Server | Compose all section components |
| `landing/app/sitemap.ts` | SEO | Single-URL sitemap |
| `landing/app/robots.ts` | SEO | Allow all + sitemap URL |
| `landing/public/og-image.png` | Asset | 1200×630 static OG image (placeholder) |
| `landing/components/Navbar.tsx` | Client | Sticky dark navbar, CTA button |
| `landing/components/Hero.tsx` | Client | Dark hero, animated blobs, headline, CTA |
| `landing/components/WhySection.tsx` | Client | 3 pain-point cards |
| `landing/components/FeaturesSection.tsx` | Client | Bento grid of 6 feature cards |
| `landing/components/HowItWorks.tsx` | Client | 3-step numbered flow, `id="how-it-works"` |
| `landing/components/TemplatesSection.tsx` | Client | Abstract template card row |
| `landing/components/Footer.tsx` | Server | Logo, copyright, app link |

---

## Task 1: Scaffold the project

**Files:**
- Create: `landing/` (entire directory via `create-next-app`)
- Modify: `landing/next.config.ts`
- Modify: `landing/tailwind.config.ts`
- Modify: `landing/app/globals.css`

- [ ] **Step 1: Scaffold a bare Next.js 15+ app (no Tailwind — we install v3 manually)**

Run from the monorepo root (`/Users/johnathanwong/Desktop/resume-app`):

```bash
npx create-next-app@latest landing \
  --typescript \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-tailwind \
  --yes
```

This creates `landing/` with Next.js 15+, TypeScript, ESLint, App Router. The `--yes` flag suppresses all interactive prompts.

- [ ] **Step 2: Install dependencies**

```bash
cd landing
npm install tailwindcss@3 postcss autoprefixer framer-motion
npx tailwindcss init --ts -p
```

This creates `tailwind.config.ts` and `postcss.config.js`.

- [ ] **Step 3: Replace `landing/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
      },
      opacity: {
        15: '0.15',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Replace `landing/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 5: Replace `landing/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000` with the default Next.js homepage. No errors in terminal.

- [ ] **Step 7: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: scaffold landing page — Next.js 15+, Tailwind v3, Framer Motion"
```

---

## Task 2: SEO foundation — layout, sitemap, robots

**Files:**
- Modify: `landing/app/layout.tsx`
- Create: `landing/app/sitemap.ts`
- Create: `landing/app/robots.ts`
- Create: `landing/public/og-image.png` (placeholder)

- [ ] **Step 1: Create a placeholder OG image**

Copy any 1200×630 pixel image to `landing/public/og-image.png`. It will be replaced with a designed version later. A solid dark rectangle with white text is sufficient for now.

If you have ImageMagick installed, this creates a quick placeholder:
```bash
cd landing
magick -size 1200x630 xc:#111827 -fill white -font Helvetica -pointsize 64 \
  -gravity Center -annotate 0 "ResumeAI" public/og-image.png
```

If not, just copy any PNG there as a placeholder — the important thing is the file exists so the build doesn't break.

- [ ] **Step 2: Replace `landing/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ResumeAI — Build Resumes That Actually Get Interviews',
  description:
    'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
  metadataBase: new URL('https://landing-resume-ai.johnathanwwh.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ResumeAI — Build Resumes That Actually Get Interviews',
    description:
      'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
    url: 'https://landing-resume-ai.johnathanwwh.com',
    siteName: 'ResumeAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ResumeAI — Build Resumes That Actually Get Interviews',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeAI — Build Resumes That Actually Get Interviews',
    description:
      'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Create `landing/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://landing-resume-ai.johnathanwwh.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
```

- [ ] **Step 4: Create `landing/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://landing-resume-ai.johnathanwwh.com/sitemap.xml',
  }
}
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Open `http://localhost:3000`. In DevTools → Elements, confirm the `<head>` contains:
- `<title>ResumeAI — Build Resumes That Actually Get Interviews</title>`
- `<meta property="og:image" ...>`
- `<link rel="canonical" href="https://landing-resume-ai.johnathanwwh.com">`

Also visit `http://localhost:3000/sitemap.xml` — should return XML with the landing URL.
Visit `http://localhost:3000/robots.txt` — should return allow-all rules.

- [ ] **Step 6: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add SEO foundation — metadata, sitemap, robots, OG image"
```

---

## Task 3: Navbar

**Files:**
- Create: `landing/components/Navbar.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/Navbar.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'

const APP_URL = 'https://resume-ai.johnathanwwh.com'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="text-white font-bold text-xl tracking-tight">ResumeAI</span>
        <motion.a
          href={APP_URL}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <span className="hidden sm:inline">Get Started →</span>
          <span className="sm:hidden">Start →</span>
        </motion.a>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx` to render Navbar**

```tsx
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <main>
      <Navbar />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Open `http://localhost:3000`. Confirm:
- Dark sticky bar visible at top
- "ResumeAI" wordmark left, blue "Get Started →" button right
- Resize to mobile width — button should show "Start →"

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add Navbar component"
```

---

## Task 4: Hero section

**Files:**
- Create: `landing/components/Hero.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/Hero.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const APP_URL = 'https://resume-ai.johnathanwwh.com'

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()

  const blobProps = prefersReducedMotion
    ? {}
    : {
        animate: { scale: [1, 1.05, 1] } as const,
        transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
      }

  const fadeUp = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay },
        }

  return (
    <section className="relative bg-gray-900 overflow-hidden py-24 sm:py-36">
      {/* Blue blob */}
      <motion.div
        {...blobProps}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl pointer-events-none"
      />
      {/* Purple blob */}
      <motion.div
        {...blobProps}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600 opacity-15 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            ✦ AI-Powered Job Search
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
        >
          Build resumes that{' '}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            actually get interviews
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeUp(0.2)}
          className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          AI-powered resume builder that tailors your resume to every job description,
          tracks your applications, and preps you for interviews — all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.3)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href={APP_URL}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-lg w-full sm:w-auto text-center"
          >
            Get Started Free →
          </motion.a>
          <a
            href="#how-it-works"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            See how it works ↓
          </a>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Open `http://localhost:3000`. Confirm:
- Dark section with blue/purple glowing blobs visible behind text
- Gradient blue text on "actually get interviews"
- Badge pill above headline
- "Get Started Free →" blue button + "See how it works ↓" secondary link
- Blobs gently pulsing (unless system has `prefers-reduced-motion`)

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add Hero section with animated blobs and CTAs"
```

---

## Task 5: Why ResumeAI section

**Files:**
- Create: `landing/components/WhySection.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/WhySection.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const reasons = [
  {
    icon: '📄',
    headline: 'Generic resumes get ignored',
    body: "Most resumes never make it past the first filter. ResumeAI rewrites yours to match every job description — keywords, tone, and all.",
  },
  {
    icon: '📋',
    headline: 'Job hunting feels like chaos',
    body: 'Applications scattered across tabs, emails, and spreadsheets. ResumeAI keeps every role, status, and document in one organized tracker.',
  },
  {
    icon: '🎤',
    headline: 'Interviews catch you off guard',
    body: 'ResumeAI generates tailored interview questions for each role and gives you AI feedback on your practice answers.',
  },
]

export default function WhySection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Why ResumeAI?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.headline}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="border border-gray-200 rounded-xl p-6"
            >
              <span className="text-3xl mb-4 block">{reason.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{reason.headline}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{reason.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Scroll below Hero. Confirm:
- White section with "Why ResumeAI?" heading
- 3 bordered cards in a row (stacks to 1 column on mobile)
- Each card has emoji icon, bold headline, gray body text
- Cards fade in as you scroll into view

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add WhySection — 3 pain-point cards"
```

---

## Task 6: Features bento grid

**Files:**
- Create: `landing/components/FeaturesSection.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/FeaturesSection.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const features = [
  {
    large: true,
    icon: '✨',
    title: 'AI Resume Tailoring',
    description:
      'Paste any job description and AI rewrites your entire resume to match — reordering, reframing, and optimizing for the role.',
  },
  {
    large: true,
    icon: '📊',
    title: 'Job Tracker',
    description:
      'Track every application with status, dates, salary, location, and attachments in a clean table view.',
  },
  {
    large: false,
    icon: '🎯',
    title: 'Interview Prep',
    description:
      'AI generates role-specific interview questions by category. Practice your answers and get AI feedback.',
  },
  {
    large: false,
    icon: '✉️',
    title: 'Cover Letter Generator',
    description:
      'Generate a tailored cover letter in Professional, Conversational, or Enthusiastic tone — streamed in real time.',
  },
  {
    large: false,
    icon: '📈',
    title: 'Fit Analysis',
    description:
      'Get an AI match score and breakdown of your strengths and gaps before you apply.',
  },
  {
    large: false,
    icon: '🎨',
    title: '20 Resume Templates',
    description:
      'Choose from 20 professional templates and download a print-ready PDF instantly.',
  },
]

export default function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = (delay = 0) => ({
    initial: prefersReducedMotion ? {} : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  })

  const largeFeatures = features.filter((f) => f.large)
  const smallFeatures = features.filter((f) => !f.large)

  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          {...fadeUp(0)}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Everything you need to land the job
        </motion.h2>

        {/* Large cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {largeFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(i * 0.1)}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            >
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Small cards 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {smallFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(0.2 + i * 0.08)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <span className="text-3xl mb-3 block">{feature.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Scroll to the Features section. Confirm:
- Gray background section with "Everything you need to land the job"
- 2 large white cards side-by-side (AI Resume Tailoring, Job Tracker)
- 4 smaller cards in 2×2 grid below
- Cards animate in as you scroll

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add FeaturesSection — bento grid of 6 feature cards"
```

---

## Task 7: How It Works section

**Files:**
- Create: `landing/components/HowItWorks.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/HowItWorks.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Build your profile once',
    description:
      'Enter your experience, skills, education, and summary. Import from an existing PDF resume to auto-fill everything.',
  },
  {
    number: '02',
    title: 'Paste a job description',
    description:
      'AI tailors your resume to the role in seconds. Generate a cover letter and check your fit score before applying.',
  },
  {
    number: '03',
    title: 'Track, prep, and apply',
    description:
      'Log your application, generate interview questions, practice your answers, and stay organized until you land the offer.',
  },
]

export default function HowItWorks() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Get started in minutes
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Dashed connector (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] border-t-2 border-dashed border-gray-200 pointer-events-none" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-blue-500 text-blue-500 font-bold text-lg mb-5 bg-white">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorks from '@/components/HowItWorks'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
      <HowItWorks />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

- Scroll to "Get started in minutes" section
- 3 numbered circles (01, 02, 03) with dashed line connecting them on desktop
- Circles have blue border, blue number
- Steps stack vertically on mobile
- Click "See how it works ↓" in the Hero — page should smooth-scroll to this section

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add HowItWorks section — 3-step numbered flow"
```

---

## Task 8: Templates preview section

**Files:**
- Create: `landing/components/TemplatesSection.tsx`
- Modify: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/components/TemplatesSection.tsx`**

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'

const templates = [
  { name: 'Minimal', bg: 'bg-white', border: 'border-gray-300', lines: 'bg-gray-300' },
  { name: 'Dark', bg: 'bg-gray-900', border: 'border-gray-700', lines: 'bg-gray-600' },
  { name: 'Teal', bg: 'bg-teal-50', border: 'border-teal-300', lines: 'bg-teal-300' },
  { name: 'Coral', bg: 'bg-orange-50', border: 'border-orange-300', lines: 'bg-orange-300' },
  { name: 'Slate', bg: 'bg-slate-100', border: 'border-slate-400', lines: 'bg-slate-400' },
  { name: 'Soft', bg: 'bg-purple-50', border: 'border-purple-300', lines: 'bg-purple-300' },
]

function AbstractResume({
  bg,
  border,
  lines,
}: {
  bg: string
  border: string
  lines: string
}) {
  return (
    <div
      className={`${bg} border ${border} rounded-lg p-3 w-32 h-44 flex-shrink-0 flex flex-col gap-2 shadow-sm`}
    >
      {/* Name block */}
      <div className={`${lines} rounded h-3 w-3/4 opacity-80`} />
      <div className={`${lines} rounded h-2 w-1/2 opacity-50`} />
      {/* Divider */}
      <div className={`${lines} h-px w-full opacity-30 mt-1`} />
      {/* Content lines */}
      <div className={`${lines} rounded h-2 w-full opacity-60`} />
      <div className={`${lines} rounded h-2 w-5/6 opacity-60`} />
      <div className={`${lines} rounded h-2 w-4/6 opacity-50`} />
      <div className={`${lines} h-px w-full opacity-20 mt-1`} />
      <div className={`${lines} rounded h-2 w-full opacity-50`} />
      <div className={`${lines} rounded h-2 w-3/4 opacity-40`} />
      <div className={`${lines} rounded h-2 w-5/6 opacity-40`} />
    </div>
  )
}

export default function TemplatesSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            20 professional templates
          </h2>
          <p className="text-gray-500">
            Pick the style that fits your industry. Download as a polished PDF in seconds.
          </p>
        </motion.div>

        <div className="flex gap-6 overflow-x-auto pb-4 md:justify-center">
          {templates.map((template, i) => (
            <motion.div
              key={template.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="flex flex-col items-center gap-2 cursor-default flex-shrink-0"
            >
              <AbstractResume {...template} />
              <span className="text-xs text-gray-400 font-medium">{template.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update `landing/app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorks from '@/components/HowItWorks'
import TemplatesSection from '@/components/TemplatesSection'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
      <HowItWorks />
      <TemplatesSection />
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Scroll to "20 professional templates" section. Confirm:
- 6 abstract A4-ratio cards in a horizontal row
- Each card has its own color palette (white, dark, teal, coral, slate, soft-purple)
- Cards show abstract line patterns suggesting a resume layout
- On mobile: cards scroll horizontally
- Hover over a card: it lifts slightly upward

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add TemplatesSection — abstract template preview cards"
```

---

## Task 9: Footer + final page assembly

**Files:**
- Create: `landing/components/Footer.tsx`
- Modify: `landing/app/page.tsx` (final version)

- [ ] **Step 1: Create `landing/components/Footer.tsx`**

```tsx
const APP_URL = 'https://resume-ai.johnathanwwh.com'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="text-white font-bold text-lg">ResumeAI</span>
          <span className="text-gray-500 text-sm">© 2026 ResumeAI. All rights reserved.</span>
        </div>
        <a
          href={APP_URL}
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
        >
          Go to app →
        </a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Replace `landing/app/page.tsx` with final version**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorks from '@/components/HowItWorks'
import TemplatesSection from '@/components/TemplatesSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhySection />
        <FeaturesSection />
        <HowItWorks />
        <TemplatesSection />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Verify the full page end-to-end**

Open `http://localhost:3000` and scroll through the entire page:
- [ ] Sticky dark Navbar present at top while scrolling
- [ ] Hero: dark section, blobs, headline with gradient, two CTAs
- [ ] "See how it works" scroll link works (smooth scrolls to `#how-it-works`)
- [ ] Why section: 3 cards, white bg
- [ ] Features: bento grid, gray bg
- [ ] How It Works: 3 numbered steps, white bg, dashed connector on desktop
- [ ] Templates: abstract cards, gray bg, horizontal scroll on mobile
- [ ] Footer: dark, logo, copyright, "Go to app →" link
- [ ] Check responsive layout at 375px mobile width — all sections stack correctly

- [ ] **Step 4: Commit**

```bash
cd .. && git add landing/ && git commit -m "feat: add Footer and complete full page assembly"
```

---

## Task 10: Production build verification

**Files:** None created — verification only.

- [ ] **Step 1: Run a production build**

```bash
cd landing
npm run build
```

Expected: build completes with no errors. Output will be in `landing/out/` (static HTML/CSS/JS).

Common errors and fixes:
- `Error: next/image Un-configured Host` → already handled by `images: { unoptimized: true }` in `next.config.ts`
- `useReducedMotion` or Framer Motion SSR error → ensure all components using it have `'use client'`
- Missing module → run `npm install` again

- [ ] **Step 2: Verify the static output**

```bash
ls landing/out/
```

Expected output:
```
404.html  _next/  index.html  og-image.png  robots.txt  sitemap.xml
```

Confirm `sitemap.xml` and `robots.txt` are present.

- [ ] **Step 3: Preview the static build locally**

```bash
npx serve landing/out
```

Open the URL printed in the terminal by `serve` (typically `http://localhost:3000` but may differ if the port is in use). Verify the page looks identical to dev mode and all links/animations work.

- [ ] **Step 4: Commit the final state**

```bash
cd .. && git add landing/ && git commit -m "feat: landing page complete — production build verified"
```

---

## Deployment Notes (not part of the plan — reference only)

To deploy on Vercel:
1. `vercel --cwd landing` (or connect the repo in Vercel dashboard, set root directory to `landing/`)
2. No env vars needed — all URLs are hardcoded
3. Custom domain: set `landing-resume-ai.johnathanwwh.com` in Vercel's domain settings
4. Build command: `npm run build` | Output directory: `out`
