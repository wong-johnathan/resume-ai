# Landing CLAUDE.md

> **Important:** This Next.js version has breaking changes from older releases. Before writing any code, read `node_modules/next/dist/docs/` for current API conventions. Heed deprecation notices. (See also `AGENTS.md`.)

Marketing landing page. Next.js (App Router) + React 19 + TypeScript + Framer Motion + TailwindCSS. Deployed as a static export to Vercel.

## Commands

```bash
npm run dev:landing           # Start Next.js dev server (port 3001)
cd landing && npm run build   # Build static export → landing/out/
```

No test suite.

## Entry Points

- `app/layout.tsx` — Root layout: sets metadata, fonts, global styles
- `app/page.tsx` — Home page (only page — this is a single-page site)

## Directory Structure

```
landing/
├── app/
│   ├── layout.tsx        # RootLayout: HTML shell, metadata, font imports, global CSS
│   ├── page.tsx          # Home page — composes all section components
│   ├── page.module.css   # CSS module for page-level layout
│   ├── globals.css       # Global CSS (resets, custom properties)
│   ├── robots.ts         # Next.js robots.txt generation
│   └── sitemap.ts        # Next.js sitemap.xml generation
├── components/
│   ├── Navbar.tsx            # Top navigation with CTA link to app
│   ├── Hero.tsx              # Hero section with headline and CTA
│   ├── FeaturesSection.tsx   # Feature grid/cards
│   ├── HowItWorks.tsx        # 3-step walkthrough
│   ├── TemplatesSection.tsx  # Resume template showcase
│   ├── WhySection.tsx        # Benefits / value proposition
│   └── Footer.tsx            # Footer with links
└── public/                   # Static assets: images, og-image.png
```

## Tech Details

| Concern | Solution |
|---|---|
| Framework | Next.js (App Router) |
| React | React 19 |
| Styling | TailwindCSS + CSS Modules |
| Animation | Framer Motion |
| Output | Static export (`output: 'export'` in `next.config.ts`) |
| Images | `unoptimized: true` — required for static export |
| Deployment | Vercel (`vercel.json` present) |
| SEO | `metadata` object in `layout.tsx`, `robots.ts`, `sitemap.ts` |

## Key Conventions

- **Static only** — no dynamic routes, no API calls, no auth, no server components with data fetching
- `output: 'export'` is set — do not use features incompatible with static export: no `getServerSideProps`, no API routes, no `next/image` optimization
- Images live in `public/` and are referenced as `/filename.png`
- The `@/*` path alias maps to the project root (set in `tsconfig.json`)
- All animations use Framer Motion — use `whileInView` + `initial` for entrance animations
- Each visual section is its own component in `components/`; `app/page.tsx` is just composition

## Adding a New Section

1. Create `components/MySection.tsx`
2. Add `import MySection from '../components/MySection'` in `app/page.tsx`
3. Place it in the desired position in the JSX
4. Use `motion.div` with `initial={{ opacity: 0, y: 20 }}` + `whileInView={{ opacity: 1, y: 0 }}` for entrance

## Environment Variables

None — fully static site with no runtime env vars.
