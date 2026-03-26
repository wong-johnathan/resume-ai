# Landing

Static marketing site for Resume AI. Single-page Next.js app exported to static HTML and deployed to Vercel.

> Part of the [resume-app](../README.md) monorepo.
> **Note:** This Next.js version may have breaking changes from older releases. Read `node_modules/next/dist/docs/` before writing code. See also `AGENTS.md`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| UI | React 19, TailwindCSS |
| Animation | Framer Motion |
| Output | Static export (`output: 'export'`) |
| Deployment | Vercel |

## Getting Started

```bash
# From the repo root
npm run dev:landing
```

Opens on [http://localhost:3001](http://localhost:3001).

### Build

```bash
cd landing
npm run build
```

Produces a fully static site in `landing/out/`. No server required.

## Structure

```
landing/
├── app/
│   ├── layout.tsx    # Root layout: metadata, fonts, global CSS
│   ├── page.tsx      # Home page — composes all section components
│   ├── globals.css
│   ├── robots.ts     # SEO: robots.txt
│   └── sitemap.ts    # SEO: sitemap.xml
├── components/
│   ├── Navbar.tsx            # Navigation with CTA
│   ├── Hero.tsx              # Headline + primary CTA
│   ├── FeaturesSection.tsx   # Feature grid
│   ├── HowItWorks.tsx        # 3-step walkthrough
│   ├── TemplatesSection.tsx  # Resume template showcase
│   ├── WhySection.tsx        # Value proposition
│   └── Footer.tsx
└── public/                   # Static assets (images, og-image.png)
```

## Deployment

Deployed to Vercel as a static site. `vercel.json` is already configured.

1. Connect the GitHub repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `landing`, Framework: **Next.js**
3. No environment variables required
4. The `output: 'export'` config in `next.config.ts` produces a static export, which Vercel deploys automatically

Push to `main` triggers an automatic redeploy.

## Adding a Section

1. Create `components/MySection.tsx`
2. Import and add it to `app/page.tsx` in the desired order
3. Use Framer Motion for entrance animations:

```tsx
import { motion } from 'framer-motion';

export default function MySection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      {/* content */}
    </motion.section>
  );
}
```

## Constraints

- `output: 'export'` is set — do not use features incompatible with static export:
  - No `getServerSideProps`
  - No API routes
  - No `next/image` optimization (use plain `<img>` tags)
- No environment variables — this is a fully static site
- The `@/*` path alias maps to the project root (set in `tsconfig.json`)
