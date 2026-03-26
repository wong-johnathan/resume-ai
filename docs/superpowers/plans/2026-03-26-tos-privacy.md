# TOS & Privacy Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Terms of Service and Privacy Policy as separate static pages to the ResumeAI landing site, linked from the footer.

**Architecture:** A shared `LegalLayout` component provides minimal chrome (logo + back link, light theme). Two new Next.js App Router page files (`app/terms/page.tsx`, `app/privacy/page.tsx`) use it. The existing `Footer.tsx` gains "Terms" and "Privacy" links. The sitemap is updated to include both routes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TailwindCSS. Static export — no dynamic features, `next/link` for all internal links.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `landing/components/LegalLayout.tsx` | Minimal header (logo + back link) + light content wrapper |
| Create | `landing/app/terms/page.tsx` | Terms of Service content + metadata |
| Create | `landing/app/privacy/page.tsx` | Privacy Policy content + metadata |
| Modify | `landing/components/Footer.tsx` | Add Terms and Privacy links |
| Modify | `landing/app/sitemap.ts` | Add `/terms` and `/privacy` entries |

---

### Task 1: Create `LegalLayout` component

**Files:**
- Create: `landing/components/LegalLayout.tsx`

- [ ] **Step 1: Create the component**

```tsx
// landing/components/LegalLayout.tsx
import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-gray-900 font-bold text-lg tracking-tight">
            ResumeAI
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify the file is saved correctly**

Open `landing/components/LegalLayout.tsx` and confirm it matches the above exactly.

- [ ] **Step 3: Commit**

```bash
git add landing/components/LegalLayout.tsx
git commit -m "feat(landing): add LegalLayout component for TOS/Privacy pages"
```

---

### Task 2: Create Terms of Service page

**Files:**
- Create: `landing/app/terms/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// landing/app/terms/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Terms of Service — ResumeAI',
  description: 'Read the Terms of Service for ResumeAI, the AI-powered resume builder.',
}

export default function TermsPage() {
  return (
    <LegalLayout>
      {/* Title block */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Legal</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400">Last updated: March 26, 2026</p>
      </div>

      <div className="space-y-8 text-gray-700">

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">By accessing or using ResumeAI, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the service. Your continued use of ResumeAI constitutes acceptance of any updates to these terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">2. What ResumeAI Does</h2>
          <p className="leading-relaxed">ResumeAI is an AI-powered platform that helps you build, manage, and tailor resumes for job applications. Features include AI-assisted resume tailoring to specific job descriptions, cover letter generation, interview preparation, and a job application tracker. AI-generated content is produced via Claude (Anthropic) and is intended as a starting point — you should review and edit all outputs before submitting them.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">3. Your Account</h2>
          <p className="leading-relaxed">You sign in to ResumeAI exclusively via Google OAuth. We do not store your Google password — all authentication is handled by Google. You are responsible for all activity that occurs under your account. If you believe your account has been compromised, contact us immediately.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">4. AI-Generated Content</h2>
          <p className="leading-relaxed">ResumeAI uses AI to generate tailored resume content, cover letters, interview questions, and sample responses. These outputs are suggestions only — they may contain inaccuracies or be unsuitable for your specific situation. You are solely responsible for reviewing, editing, and deciding whether to use any AI-generated content. We make no guarantees about the accuracy or effectiveness of AI outputs.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">5. Acceptable Use</h2>
          <p className="leading-relaxed">You agree not to misuse the service. Prohibited activities include: using the platform to generate misleading or fraudulent resume content, scraping or reverse-engineering the platform, attempting to circumvent rate limits (10 AI requests per 15 minutes per account), or using the service in any way that violates applicable laws. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">6. Intellectual Property</h2>
          <p className="leading-relaxed">You retain ownership of all resume content, work history, and personal data you provide. By using the service, you grant ResumeAI a limited license to process and store your content solely to provide the service. ResumeAI owns the platform, codebase, templates, and all non-user content. You may not copy or reproduce the platform or its templates outside of normal use.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">7. Service Availability</h2>
          <p className="leading-relaxed">ResumeAI is provided "as is" without any warranty of uptime or availability. We may modify, suspend, or discontinue any part of the service at any time without notice. We are not liable for any losses resulting from service downtime or changes.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">8. Termination</h2>
          <p className="leading-relaxed">We may suspend or terminate your account at any time if we determine you have violated these Terms of Service. You may stop using the service at any time. Upon termination, you may request deletion of your data as described in our Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">9. Limitation of Liability</h2>
          <p className="leading-relaxed">ResumeAI is not liable for any job application outcomes, hiring decisions, or career results arising from your use of the platform. To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid us in the past 12 months (which, for a free service, is $0).</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">10. Changes to These Terms</h2>
          <p className="leading-relaxed">We may update these Terms of Service from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the service after changes are posted constitutes your acceptance of the updated terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">11. Contact</h2>
          <p className="leading-relaxed">If you have questions about these Terms of Service, please contact us through the ResumeAI application.</p>
        </section>

      </div>

      {/* Cross-link */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link href="/privacy" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
          Privacy Policy →
        </Link>
      </div>
    </LegalLayout>
  )
}
```

- [ ] **Step 2: Run the dev server and verify the page renders**

```bash
npm run dev:landing
```

Open `http://localhost:3001/terms`. Confirm:
- Minimal header with "ResumeAI" and "← Back to home" (both linking to `/`)
- White background, readable text
- All 11 sections render with blue uppercase headings
- "Privacy Policy →" link at the bottom

- [ ] **Step 3: Commit**

```bash
git add landing/app/terms/page.tsx
git commit -m "feat(landing): add Terms of Service page"
```

---

### Task 3: Create Privacy Policy page

**Files:**
- Create: `landing/app/privacy/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// landing/app/privacy/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy — ResumeAI',
  description: 'Read the Privacy Policy for ResumeAI — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout>
      {/* Title block */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Legal</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400">Last updated: March 26, 2026</p>
      </div>

      <div className="space-y-8 text-gray-700">

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">1. Information We Collect</h2>
          <p className="leading-relaxed">We collect the following information when you use ResumeAI:</p>
          <ul className="mt-3 space-y-1 list-disc list-inside text-sm leading-relaxed">
            <li><strong>Google account info:</strong> your name, email address, and profile picture, received via Google OAuth when you sign in.</li>
            <li><strong>Resume content:</strong> work experience, education, skills, certifications, and other profile data you enter.</li>
            <li><strong>Job applications:</strong> job descriptions, application status, notes, and cover letters you create.</li>
            <li><strong>AI-generated content:</strong> tailored resumes, cover letters, and interview prep materials generated on your behalf.</li>
            <li><strong>Usage data:</strong> activity logs (e.g., which features you use) to help us improve the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">2. How We Use Your Data</h2>
          <p className="leading-relaxed">We use your data to provide and improve the ResumeAI service: generating tailored resumes and cover letters, producing PDF exports, tracking your job applications, and personalizing your experience. We do not sell your personal data to third parties. We do not use your data for advertising.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">3. AI Processing</h2>
          <p className="leading-relaxed">When you use AI features (resume tailoring, cover letter generation, interview prep), your resume content and job description are sent to Anthropic's Claude API to generate the output. Anthropic processes this data under their own privacy policy. Your data is not used to train AI models. We only send the minimum data necessary to generate the requested output.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">4. Google OAuth</h2>
          <p className="leading-relaxed">We use Google OAuth exclusively for authentication. When you sign in, Google shares your name, email address, and profile picture with us. We do not request access to your Gmail, Google Drive, Google Calendar, or any other Google services. We store a session token to keep you signed in — we never see your Google password.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">5. Data Storage</h2>
          <p className="leading-relaxed">Your data is stored in a PostgreSQL database hosted on Railway. Sessions are stored server-side. We take reasonable technical measures to protect your data, including encrypted connections (TLS) and secure credential management.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">6. Data Retention</h2>
          <p className="leading-relaxed">We retain your data for as long as your account is active. If you wish to delete your account and all associated data, contact us through the application and we will process your request within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">7. Cookies & Sessions</h2>
          <p className="leading-relaxed">We use a single session cookie (<code className="bg-gray-100 px-1 rounded text-xs">connect.sid</code>) to keep you signed in. This is a strictly necessary cookie — the service cannot function without it. We do not use tracking cookies, advertising cookies, or any third-party analytics cookies.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">8. Third-Party Services</h2>
          <p className="leading-relaxed">We use the following third-party services to operate ResumeAI:</p>
          <ul className="mt-3 space-y-1 list-disc list-inside text-sm leading-relaxed">
            <li><strong>Anthropic:</strong> AI model provider (Claude) for resume tailoring, cover letters, and interview prep.</li>
            <li><strong>Railway:</strong> cloud hosting for the API server and database.</li>
            <li><strong>Vercel:</strong> hosting for this landing page.</li>
            <li><strong>Google:</strong> authentication via Google OAuth.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">9. Your Rights</h2>
          <p className="leading-relaxed">You have the right to access, correct, or delete your personal data. You can update your profile information directly within the app. To request a full export or deletion of your account data, contact us through the ResumeAI application. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">10. Children's Privacy</h2>
          <p className="leading-relaxed">ResumeAI is not intended for use by anyone under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with their data, please contact us and we will delete it promptly.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">11. Changes to This Policy</h2>
          <p className="leading-relaxed">We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. We encourage you to review this page periodically. Continued use of the service after changes are posted constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">12. Contact</h2>
          <p className="leading-relaxed">If you have questions or concerns about this Privacy Policy, please contact us through the ResumeAI application.</p>
        </section>

      </div>

      {/* Cross-link */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link href="/terms" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
          Terms of Service →
        </Link>
      </div>
    </LegalLayout>
  )
}
```

- [ ] **Step 2: Verify the page renders**

With dev server still running (`npm run dev:landing`), open `http://localhost:3001/privacy`. Confirm:
- Same minimal header layout as `/terms`
- All 12 sections render with blue uppercase headings
- `connect.sid` code snippet renders with gray background pill
- Third-party list renders as bullet points
- "Terms of Service →" cross-link at the bottom

- [ ] **Step 3: Commit**

```bash
git add landing/app/privacy/page.tsx
git commit -m "feat(landing): add Privacy Policy page"
```

---

### Task 4: Update Footer with legal links

**Files:**
- Modify: `landing/components/Footer.tsx`

Current file (`landing/components/Footer.tsx`):
```tsx
const APP_URL = 'https://app.resume.johnathanwwh.com'

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
          Go to app <span aria-hidden="true">→</span>
        </a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 1: Replace the file with the updated version**

```tsx
// landing/components/Footer.tsx
import Link from 'next/link'

const APP_URL = 'https://app.resume.johnathanwwh.com'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="text-white font-bold text-lg">ResumeAI</span>
          <span className="text-gray-500 text-sm">© 2026 ResumeAI. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            Privacy
          </Link>
          <a
            href={APP_URL}
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            Go to app <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify footer on landing page**

With dev server running, open `http://localhost:3001`. Scroll to footer. Confirm:
- "Terms" and "Privacy" links appear in gray between copyright and "Go to app"
- Clicking "Terms" navigates to `http://localhost:3001/terms`
- Clicking "Privacy" navigates to `http://localhost:3001/privacy`
- "← Back to home" on each legal page navigates back to `http://localhost:3001`

- [ ] **Step 3: Commit**

```bash
git add landing/components/Footer.tsx
git commit -m "feat(landing): add Terms and Privacy links to footer"
```

---

### Task 5: Update sitemap

**Files:**
- Modify: `landing/app/sitemap.ts`

Current file:
```ts
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://resume.johnathanwwh.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
```

- [ ] **Step 1: Add /terms and /privacy entries**

```ts
// landing/app/sitemap.ts
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://resume.johnathanwwh.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://resume.johnathanwwh.com/terms',
      lastModified: new Date('2026-03-26'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://resume.johnathanwwh.com/privacy',
      lastModified: new Date('2026-03-26'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
```

- [ ] **Step 2: Verify sitemap generates correctly**

```bash
cd landing && npm run build
```

Check `landing/out/sitemap.xml` — confirm it contains entries for `/`, `/terms`, and `/privacy`.

- [ ] **Step 3: Commit**

```bash
git add landing/app/sitemap.ts
git commit -m "feat(landing): add /terms and /privacy to sitemap"
```

---

### Task 6: Final build verification

- [ ] **Step 1: Run a clean build**

```bash
cd landing && npm run build
```

Expected: build completes with no errors. Output in `landing/out/`.

- [ ] **Step 2: Verify static output**

```bash
ls landing/out/terms landing/out/privacy
```

Expected: both directories exist and contain `index.html`.

- [ ] **Step 3: Check for TypeScript errors**

```bash
cd landing && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit if any cleanup was needed, then final commit**

```bash
git add -A
git commit -m "feat(landing): TOS and Privacy Policy pages complete"
```
