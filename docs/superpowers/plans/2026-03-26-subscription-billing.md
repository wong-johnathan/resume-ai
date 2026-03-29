# Subscription & Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe-powered subscription billing with a free trial (3 jobs + 50 AI credits), a Pro monthly/annual plan (750 credits/month), AI credit deduction on every AI action, and credit cost tooltips throughout the UI.

**Architecture:** A `Subscription` record is created lazily for each user and tracks status (TRIAL/PRO), remaining credits, and reset date. Job creation is gated by trial job count. AI actions are gated by credit balance via `requireCredits(n)` middleware. The client reads `subscription` from `/api/auth/me` and renders credit cost badges on every AI button. Credits top up automatically on Pro renewal via Stripe webhook.

**Tech Stack:** Stripe Node SDK (`stripe`), Prisma 5, Express, React 18 + TailwindCSS, Zustand (toasts), TanStack Query.

---

## Monetization Design

### Trial Plan (Free, Forever)
- Create up to **3 job applications**
- **50 AI credits** (one-time, never expire, never reset)
- All AI features available within credit balance

### Pro Plan
- **$9.99/month** or **$79/year**
- Unlimited job applications
- **750 AI credits/month** — reset on each billing renewal
- Stripe Customer Portal for self-serve cancel/upgrade/downgrade

### AI Credit Costs

| Action | Credits | Server route |
|---|---|---|
| Resume tailoring | 5 | `POST /api/ai/tailor` |
| Cover letter | 3 | `POST /api/ai/cover-letter` |
| Interview categories | 0 (free) | `POST /api/ai/interview-categories` |
| Interview questions | 5 | `POST /api/ai/interview-questions` |
| Sample response | 2 | `POST /api/ai/interview-sample-response` |
| Answer feedback | 2 | `POST /api/ai/interview-feedback` |
| Summary improvement | 1 | `POST /api/ai/improve-summary` |
| Sample job generate | 1 | `POST /api/ai/sample-job` |

**Trial math:** 3 full jobs (tailor + cover letter + prep generate = 13 credits each = 39) leaves 11 credits for sample responses and feedback. Enough for a meaningful taste without unlimited usage.

**Credit gate behavior:** When `creditsRemaining < cost`, return HTTP 402 `{ error: 'insufficient_credits', creditsRequired: N, creditsRemaining: M, upgradeUrl: '/billing' }`.

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `server/src/services/stripe.ts` | Stripe client singleton + checkout/portal/customer helpers |
| `server/src/services/credits.ts` | `deductCredits(userId, cost)` — atomic decrement with balance check |
| `server/src/routes/billing.ts` | GET /api/billing/status, POST /checkout, POST /portal, POST /webhook |
| `server/src/middleware/requireSubscription.ts` | Gates `POST /api/jobs`: trial users max 3 jobs |
| `server/src/middleware/requireCredits.ts` | Factory `requireCredits(n)` — checks + deducts credits before AI handler runs |
| `client/src/api/billing.ts` | Client API wrappers for billing endpoints |
| `client/src/pages/BillingPage.tsx` | Current plan, credit balance meter, upgrade CTA or Customer Portal |
| `client/src/components/ui/UpgradeModal.tsx` | Modal shown on 402 trial job limit |
| `client/src/components/ui/CreditCost.tsx` | Inline badge showing credit cost: `⚡ 5 credits` |
| `client/src/hooks/useSubscription.ts` | React Query hook: fetches and caches subscription/credit status |

### Modified Files
| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add credits fields + `SUBSCRIPTION_UPGRADED` to `ActivityAction` enum |
| `server/src/config/env.ts` | Add Stripe env vars |
| `server/src/app.ts` | Register billing router; conditional body parser for webhook |
| `server/src/routes/auth.ts` | Include `subscription` + credits in `/api/auth/me` |
| `server/src/routes/jobs.ts` | Add `requireSubscription` to `POST /api/jobs` |
| `server/src/routes/ai.ts` | Add `requireCredits(n)` to each AI route |
| `server/src/routes/interviewPrep.ts` | Add `requireCredits(n)` to prep generate, sample, feedback routes |
| `server/.env.example` | Add Stripe env examples |
| `client/src/types/index.ts` | Add `UserSubscription` type |
| `client/src/context/AuthContext.tsx` | `subscription` available on user from `/me` |
| `client/src/App.tsx` | Add `/billing` route |
| `client/src/components/layout/Sidebar.tsx` | Billing nav link + credit balance badge |
| `client/src/pages/JobTrackerPage.tsx` | Show UpgradeModal on 402 job limit |
| `client/src/pages/JobDetailPage.tsx` | `CreditCost` badges on tailor + cover letter buttons |
| `client/src/components/jobs/InterviewPrepPanel.tsx` | `CreditCost` badge on generate button |
| `client/src/components/jobs/InterviewQuestionsView.tsx` | `CreditCost` badges on sample/feedback buttons |
| `client/src/pages/ProfilePage.tsx` | `CreditCost` badge on summary improve button |
| `admin/src/api/admin.ts` | Add subscription to user detail type |
| `admin/src/pages/UserDetail.tsx` | Show subscription + credit balance |
| `server/src/routes/admin/users.ts` | Include subscription in user detail response |

---

## Task 1: Database — Subscription Model with Credits

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add Subscription model and credits fields**

Add after the `User` model relations block, before the Profile section:

```prisma
// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────

model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  status               SubscriptionStatus @default(TRIAL)
  creditsRemaining     Int                @default(50)
  creditsTotal         Int                @default(50)
  creditsResetAt       DateTime?
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}

enum SubscriptionStatus {
  TRIAL
  PRO
  EXPIRED
}
```

Also add `subscription Subscription?` to the `User` model relations block.

Also add `SUBSCRIPTION_UPGRADED` to the existing `ActivityAction` enum:

```prisma
enum ActivityAction {
  // ... existing values unchanged ...
  SUBSCRIPTION_UPGRADED  // add this line
}
```

- [ ] **Step 2: Run migration**

```bash
cd /path/to/resume-app && npm run db:migrate
# Migration name: add_subscription_with_credits
```

Expected: Migration created and applied.

- [ ] **Step 3: Verify in Prisma Studio**

```bash
npm run db:studio
```

Confirm `Subscription` table has `creditsRemaining`, `creditsTotal`, `creditsResetAt` columns.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Subscription model with credit fields"
```

---

## Task 2: Stripe Service + Env Config

**Files:**
- Create: `server/src/services/stripe.ts`
- Modify: `server/src/config/env.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Install stripe**

```bash
cd server && npm install stripe
```

- [ ] **Step 2: Add Stripe env vars to env.ts**

```typescript
STRIPE_SECRET_KEY: z.string().min(1),
STRIPE_WEBHOOK_SECRET: z.string().min(1),
STRIPE_PRICE_MONTHLY: z.string().min(1),
STRIPE_PRICE_ANNUAL: z.string().min(1),
```

- [ ] **Step 3: Add to .env.example**

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

- [ ] **Step 4: Create stripe.ts service**

```typescript
import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  displayName: string | null
): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: displayName ?? undefined,
    metadata: { userId },
  });

  // Race condition: two concurrent requests could both reach here before either writes.
  // Handle the unique constraint violation gracefully.
  try {
    await prisma.subscription.upsert({
      where: { userId },
      update: { stripeCustomerId: customer.id },
      create: { userId, stripeCustomerId: customer.id },
    });
  } catch {
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;
    throw new Error('Failed to persist Stripe customer');
  }

  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/stripe.ts server/src/config/env.ts server/.env.example server/package.json server/package-lock.json
git commit -m "feat: add Stripe service and env config"
```

---

## Task 3: Credits Service

**Files:**
- Create: `server/src/services/credits.ts`

- [ ] **Step 1: Create credits.ts**

```typescript
import { prisma } from '../config/prisma.js';

/**
 * Atomically deducts `cost` credits from the user's subscription.
 * Returns { ok: true } if deducted, { ok: false, creditsRemaining } if insufficient.
 *
 * Uses a raw UPDATE with WHERE creditsRemaining >= cost to prevent negative balances
 * without needing a transaction.
 */
export async function deductCredits(
  userId: string,
  cost: number
): Promise<{ ok: boolean; creditsRemaining: number }> {
  // Ensure subscription row exists (lazy creation for pre-existing users)
  await prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Atomic conditional decrement — only updates if balance is sufficient
  const result = await prisma.$executeRaw`
    UPDATE "Subscription"
    SET "creditsRemaining" = "creditsRemaining" - ${cost},
        "updatedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "creditsRemaining" >= ${cost}
  `;

  if (result === 0) {
    // No row was updated — insufficient credits
    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { creditsRemaining: true },
    });
    return { ok: false, creditsRemaining: sub?.creditsRemaining ?? 0 };
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { creditsRemaining: true },
  });
  return { ok: true, creditsRemaining: sub?.creditsRemaining ?? 0 };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/credits.ts
git commit -m "feat: add atomic credit deduction service"
```

---

## Task 4: requireSubscription + requireCredits Middleware

**Files:**
- Create: `server/src/middleware/requireSubscription.ts`
- Create: `server/src/middleware/requireCredits.ts`

- [ ] **Step 1: Create requireSubscription.ts**

Gates `POST /api/jobs` — trial users max 3 jobs.

```typescript
import { RequestHandler } from 'express';
import { prisma } from '../config/prisma.js';

export const requireSubscription: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const sub = await prisma.subscription.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    if (sub.status === 'PRO') return next();

    if (sub.status === 'TRIAL') {
      const jobCount = await prisma.jobApplication.count({ where: { userId } });
      if (jobCount < 3) return next();

      return res.status(402).json({
        error: 'trial_limit_reached',
        message: 'You have used all 3 free trial jobs. Upgrade to Pro for unlimited jobs.',
        jobsUsed: jobCount,
        limit: 3,
        upgradeUrl: '/billing',
      });
    }

    return res.status(402).json({
      error: 'subscription_required',
      message: 'A Pro subscription is required to continue.',
      upgradeUrl: '/billing',
    });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Create requireCredits.ts**

Factory middleware — apply to each AI route with its specific cost.

```typescript
import { RequestHandler } from 'express';
import { deductCredits } from '../services/credits.js';

/**
 * Returns middleware that deducts `cost` credits before the AI handler runs.
 * On insufficient balance: 402 with { error: 'insufficient_credits', creditsRequired, creditsRemaining, upgradeUrl }
 *
 * Usage: router.post('/tailor', requireAuth, requireCredits(5), async (req, res) => { ... })
 */
export function requireCredits(cost: number): RequestHandler {
  return async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const result = await deductCredits(userId, cost);

      if (!result.ok) {
        return res.status(402).json({
          error: 'insufficient_credits',
          message: `This action requires ${cost} credits. You have ${result.creditsRemaining} remaining.`,
          creditsRequired: cost,
          creditsRemaining: result.creditsRemaining,
          upgradeUrl: '/billing',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 3: Apply requireSubscription to jobs router**

In `server/src/routes/jobs.ts`:

```typescript
import { requireSubscription } from '../middleware/requireSubscription.js';

// Change POST / handler:
router.post('/', requireAuth, requireSubscription, async (req, res) => {
```

- [ ] **Step 4: Apply requireCredits to AI routes**

In `server/src/routes/ai.ts`, add `requireCredits(n)` after `requireAuth` on each route:

```typescript
import { requireCredits } from '../middleware/requireCredits.js';

router.post('/tailor',          requireAuth, requireCredits(5), async (req, res) => { ... });
router.post('/cover-letter',    requireAuth, requireCredits(3), async (req, res) => { ... });
router.post('/improve-summary', requireAuth, requireCredits(1), async (req, res) => { ... });
router.post('/sample-job',      requireAuth, requireCredits(1), async (req, res) => { ... });
```

- [ ] **Step 5: Apply requireCredits to interview AI routes in ai.ts**

The interview prep AI routes all live in `server/src/routes/ai.ts`, **not** in `interviewPrep.ts`.
`interviewPrep.ts` only handles GET (fetch stored prep) and PATCH (save answers) — no AI calls.

In `server/src/routes/ai.ts`, add `requireCredits` after `requireAuth` on these routes:

```typescript
import { requireCredits } from '../middleware/requireCredits.js';

// /interview-categories — FREE (discovery step, returns category names only)
// No change needed.

// /interview-questions — 5 credits (main generation: questions per selected categories)
router.post('/interview-questions',       /* add */ requireCredits(5), validateBody(...), async ...);

// /interview-feedback — 2 credits (AI evaluates user's submitted answer)
router.post('/interview-feedback',        /* add */ requireCredits(2), validateBody(...), async ...);

// /interview-sample-response — 2 credits (AI writes a model answer)
router.post('/interview-sample-response', /* add */ requireCredits(2), validateBody(...), async ...);
```

Place `requireCredits(n)` **before** `validateBody(...)` in the middleware chain so credit deduction happens before body parsing overhead.

- [ ] **Step 6: Manual smoke test**

Start server. With a user whose `creditsRemaining = 0`, call any AI route:
```bash
curl -X POST http://localhost:3000/api/ai/improve-summary \
  -H "Content-Type: application/json" \
  -b "connect.sid=<session>" \
  -d '{"currentSummary":"test","targetRole":"engineer"}'
```
Expected: HTTP 402 `{ error: 'insufficient_credits', creditsRequired: 1, creditsRemaining: 0 }`.

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/requireSubscription.ts server/src/middleware/requireCredits.ts server/src/routes/jobs.ts server/src/routes/ai.ts
git commit -m "feat: add requireSubscription and requireCredits middleware, gate all AI routes"
```

---

## Task 5: Billing Routes (checkout, portal, webhook, status)

**Files:**
- Create: `server/src/routes/billing.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create billing.ts router**

```typescript
import express, { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import {
  stripe,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
} from '../services/stripe.js';
import { logActivity } from '../services/activityLog.js';
import { ActivityAction } from '@prisma/client';

const router = Router();

const checkoutSchema = z.object({
  priceId: z.enum(['monthly', 'annual']),
});

// GET /api/billing/status
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [sub, jobsUsed] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.jobApplication.count({ where: { userId } }),
    ]);

    res.json({
      status: sub?.status ?? 'TRIAL',
      creditsRemaining: sub?.creditsRemaining ?? 50,
      creditsTotal: sub?.creditsTotal ?? 50,
      creditsResetAt: sub?.creditsResetAt ?? null,
      jobsUsed,
      trialLimit: 3,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/checkout
router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = req.user!;
    const priceId =
      req.body.priceId === 'annual' ? env.STRIPE_PRICE_ANNUAL : env.STRIPE_PRICE_MONTHLY;

    const customerId = await getOrCreateStripeCustomer(userId, user.email, user.displayName);
    const url = await createCheckoutSession(
      customerId,
      priceId,
      `${env.CLIENT_URL}/billing?success=true`,
      `${env.CLIENT_URL}/billing?canceled=true`
    );

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal
router.post('/portal', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sub = await prisma.subscription.findUnique({ where: { userId } });

    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }

    const url = await createPortalSession(sub.stripeCustomerId, `${env.CLIENT_URL}/billing`);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook
// req.body is a raw Buffer — ensured by the conditional body parser in app.ts
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond immediately — process async to avoid Stripe retries on non-transient errors
  res.json({ received: true });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
  try {
    const customerId = stripeSubscription.customer as string;
    const sub = await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
    if (!sub) return;

    const isActive =
      stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';

    const nextReset = new Date(stripeSubscription.current_period_end * 1000);
    const incomingPeriodStart = new Date(stripeSubscription.current_period_start * 1000);

    // Only reset credits when the billing period actually advances (renewal) or on first activation.
    // This prevents mid-period events (plan change, payment method update, cancellation reversal)
    // from prematurely topping up credits the user has already consumed.
    const isNewPeriod =
      !sub.currentPeriodStart ||
      incomingPeriodStart.getTime() > sub.currentPeriodStart.getTime();
    const shouldResetCredits = isActive && (isNewPeriod || sub.status !== 'PRO');

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: isActive ? 'PRO' : 'EXPIRED',
        creditsRemaining: shouldResetCredits ? 750 : sub.creditsRemaining,
        creditsTotal: shouldResetCredits ? 750 : sub.creditsTotal,
        creditsResetAt: isActive ? nextReset : null,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price.id ?? null,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: nextReset,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    if (isActive) {
      await logActivity(sub.userId, ActivityAction.SUBSCRIPTION_UPGRADED, {
        stripeSubscriptionId: stripeSubscription.id,
        priceId: stripeSubscription.items.data[0]?.price.id,
      });
    }
  } catch (err) {
    console.error('handleSubscriptionUpdate error:', err);
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  try {
    const customerId = stripeSubscription.customer as string;
    const sub = await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
    if (!sub) return;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED', cancelAtPeriodEnd: false },
    });
  } catch (err) {
    console.error('handleSubscriptionDeleted error:', err);
  }
}

export default router;
```

- [ ] **Step 2: Register billing router in app.ts**

> **Webhook body parsing:** The webhook needs a raw `Buffer` for Stripe signature verification. Route-level `express.raw()` runs after the global `express.json()` has already consumed the stream. The reliable fix is a conditional body parser that replaces `app.use(express.json(...))`.

**a)** At the **top of the file**, alongside the other router imports, add:
```typescript
import billingRouter from './routes/billing.js';
```

**b)** Find the existing `app.use(express.json(...))` line. **Replace it** with:
```typescript
// Conditional body parser: webhook needs raw Buffer; all other routes get JSON.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '2mb' })(req, res, next);
  }
});
```

**c)** In the routes registration block, add:
```typescript
app.use('/api/billing', billingRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4: Manual smoke test**

```bash
curl http://localhost:3000/api/billing/status -b "connect.sid=<session>"
```
Expected: `{"status":"TRIAL","creditsRemaining":50,"creditsTotal":50,...}`

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/billing.ts server/src/app.ts
git commit -m "feat: add billing routes and conditional body parser for webhook"
```

---

## Task 6: Expose Subscription + Credits in /api/auth/me

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Include subscription in /me response**

In the GET `/me` handler, add after the user is confirmed authenticated:

```typescript
// Read-only — subscription is created lazily by requireSubscription/requireCredits on first use
const [subscription, jobsUsed] = await Promise.all([
  prisma.subscription.findUnique({ where: { userId: req.user!.id } }),
  prisma.jobApplication.count({ where: { userId: req.user!.id } }),
]);

res.json({
  ...req.user,
  subscription: {
    status: subscription?.status ?? 'TRIAL',
    creditsRemaining: subscription?.creditsRemaining ?? 50,
    creditsTotal: subscription?.creditsTotal ?? 50,
    creditsResetAt: subscription?.creditsResetAt ?? null,
    jobsUsed,
    trialLimit: 3,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: include subscription and credits in /api/auth/me response"
```

---

## Task 7: Client Types + Auth Context

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/context/AuthContext.tsx`

- [ ] **Step 1: Add UserSubscription type to types/index.ts**

```typescript
export interface UserSubscription {
  status: 'TRIAL' | 'PRO' | 'EXPIRED';
  creditsRemaining: number;
  creditsTotal: number;
  creditsResetAt: string | null;
  jobsUsed: number;
  trialLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
```

Add `subscription?: UserSubscription` to the existing `User` type.

- [ ] **Step 2: Verify useAuth().user.subscription is accessible**

No code changes needed in `AuthContext.tsx` if `User` type is updated — the API already returns `subscription` nested in the `/me` response.

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add UserSubscription type to client"
```

---

## Task 8: Client Billing API + useSubscription Hook

**Files:**
- Create: `client/src/api/billing.ts`
- Create: `client/src/hooks/useSubscription.ts`

- [ ] **Step 1: Create billing.ts API wrappers**

```typescript
import api from './client';

export interface BillingStatus {
  status: 'TRIAL' | 'PRO' | 'EXPIRED';
  creditsRemaining: number;
  creditsTotal: number;
  creditsResetAt: string | null;
  jobsUsed: number;
  trialLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await api.get<BillingStatus>('/billing/status');
  return data;
}

export async function startCheckout(priceId: 'monthly' | 'annual'): Promise<void> {
  const { data } = await api.post<{ url: string }>('/billing/checkout', { priceId });
  window.location.href = data.url;
}

export async function openCustomerPortal(): Promise<void> {
  const { data } = await api.post<{ url: string }>('/billing/portal');
  window.location.href = data.url;
}
```

- [ ] **Step 2: Create useSubscription.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { getBillingStatus } from '../api/billing';
import { useAuth } from '../context/AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: getBillingStatus,
    staleTime: 60_000,
    enabled: !!user,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api/billing.ts client/src/hooks/useSubscription.ts
git commit -m "feat: add billing API wrappers and useSubscription hook"
```

---

## Task 9: CreditCost Badge Component

**Files:**
- Create: `client/src/components/ui/CreditCost.tsx`

This badge is placed inline on every AI action button to show its credit cost.

- [ ] **Step 1: Create CreditCost.tsx**

```tsx
import { Zap } from 'lucide-react';

interface Props {
  cost: number;
  /** If true, renders as a tooltip-style popover on hover rather than inline */
  tooltip?: boolean;
}

export default function CreditCost({ cost, tooltip = false }: Props) {
  const badge = (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      <Zap className="w-3 h-3" />
      {cost}
    </span>
  );

  if (!tooltip) return badge;

  return (
    <span className="relative group">
      {badge}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap bg-gray-900 text-white text-xs rounded px-2 py-1">
        Costs {cost} credit{cost !== 1 ? 's' : ''}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/CreditCost.tsx
git commit -m "feat: add CreditCost badge component"
```

---

## Task 10: Add CreditCost Badges to AI Action Buttons

**Files:**
- Modify: `client/src/pages/JobDetailPage.tsx`
- Modify: `client/src/components/jobs/InterviewPrepPanel.tsx`
- Modify: `client/src/components/jobs/InterviewQuestionsView.tsx`
- Modify: `client/src/pages/ProfilePage.tsx`

Pattern for every AI button: import `CreditCost`, place `<CreditCost cost={N} />` immediately after the button label text (or in a `flex gap-2` wrapper alongside the button).

- [ ] **Step 1: JobDetailPage — tailor resume + cover letter buttons**

Find the "Tailor Resume" button and "Generate Cover Letter" button. Add `CreditCost` next to each:

```tsx
import CreditCost from '../components/ui/CreditCost';

// Tailor button example:
<Button onClick={handleTailor}>
  Tailor Resume
</Button>
<CreditCost cost={5} tooltip />

// Cover letter button example:
<Button onClick={handleCoverLetter}>
  Generate Cover Letter
</Button>
<CreditCost cost={3} tooltip />
```

Also intercept 402 responses from these actions and show the out-of-credits toast:
```typescript
} catch (err: any) {
  if (err?.response?.status === 402 && err.response.data?.error === 'insufficient_credits') {
    addToast(`Not enough credits. You need ${err.response.data.creditsRequired}, have ${err.response.data.creditsRemaining}.`, 'error');
  } else {
    addToast('Action failed', 'error');
  }
}
```

- [ ] **Step 2: InterviewPrepPanel — generate prep button**

```tsx
import CreditCost from '../CreditCost'; // adjust import path

<Button onClick={handleGenerate}>
  Generate Interview Prep
</Button>
<CreditCost cost={5} tooltip />
```

- [ ] **Step 3: InterviewQuestionsView — sample response + feedback buttons**

```tsx
// Sample response button (per question):
<Button onClick={() => handleSample(questionId)}>
  Get Sample Answer
</Button>
<CreditCost cost={2} tooltip />

// Feedback button (per question):
<Button onClick={() => handleFeedback(questionId)}>
  Get AI Feedback
</Button>
<CreditCost cost={2} tooltip />
```

- [ ] **Step 4: ProfilePage — improve summary button**

```tsx
<Button onClick={handleImproveSummary}>
  Improve with AI
</Button>
<CreditCost cost={1} tooltip />
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/JobDetailPage.tsx client/src/components/jobs/InterviewPrepPanel.tsx client/src/components/jobs/InterviewQuestionsView.tsx client/src/pages/ProfilePage.tsx
git commit -m "feat: add credit cost badges to all AI action buttons"
```

---

## Task 11: UpgradeModal + JobTracker Gate

**Files:**
- Create: `client/src/components/ui/UpgradeModal.tsx`
- Modify: `client/src/pages/JobTrackerPage.tsx`

- [ ] **Step 1: Create UpgradeModal.tsx**

```tsx
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { startCheckout } from '../../api/billing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);

  async function handleUpgrade(plan: 'monthly' | 'annual') {
    setLoading(plan);
    try {
      await startCheckout(plan);
    } catch {
      setLoading(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade to Pro">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          You've used all 3 free trial jobs. Upgrade to Pro for unlimited jobs and
          750 AI credits per month.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="font-semibold text-gray-900">Monthly</div>
            <div className="text-2xl font-bold text-gray-900">
              $9.99<span className="text-sm font-normal text-gray-500">/mo</span>
            </div>
            <Button className="w-full" onClick={() => handleUpgrade('monthly')} disabled={loading !== null}>
              {loading === 'monthly' ? 'Redirecting…' : 'Get Pro Monthly'}
            </Button>
          </div>
          <div className="border-2 border-blue-500 rounded-lg p-4 space-y-2 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              Best Value
            </div>
            <div className="font-semibold text-gray-900">Annual</div>
            <div className="text-2xl font-bold text-gray-900">
              $79<span className="text-sm font-normal text-gray-500">/yr</span>
            </div>
            <Button className="w-full" onClick={() => handleUpgrade('annual')} disabled={loading !== null}>
              {loading === 'annual' ? 'Redirecting…' : 'Get Pro Annual'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">Cancel anytime. Powered by Stripe.</p>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Gate job creation in JobTrackerPage.tsx**

```tsx
import { useState } from 'react';
import UpgradeModal from '../components/ui/UpgradeModal';

const [showUpgrade, setShowUpgrade] = useState(false);

// In job create catch block:
} catch (err: any) {
  if (err?.response?.status === 402) {
    setShowUpgrade(true);
  } else {
    addToast('Failed to create job', 'error');
  }
}

// In JSX:
<UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/UpgradeModal.tsx client/src/pages/JobTrackerPage.tsx
git commit -m "feat: add UpgradeModal and job creation gate"
```

---

## Task 12: Billing Page + Sidebar

**Files:**
- Create: `client/src/pages/BillingPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create BillingPage.tsx**

```tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { startCheckout, openCustomerPortal } from '../api/billing';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { Zap } from 'lucide-react';

export default function BillingPage() {
  const { data: sub, isLoading } = useSubscription();
  const { addToast } = useAppStore();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get('success') === 'true') {
      addToast('Welcome to Pro! 750 credits have been added to your account.', 'success');
      setParams({});
    }
    if (params.get('canceled') === 'true') {
      addToast('Checkout canceled.', 'error');
      setParams({});
    }
  }, [params, addToast, setParams]);

  if (isLoading) return <div className="p-8 text-gray-500">Loading…</div>;

  const isPro = sub?.status === 'PRO';
  const jobsRemaining = Math.max(0, (sub?.trialLimit ?? 3) - (sub?.jobsUsed ?? 0));
  const creditPct = Math.round(((sub?.creditsRemaining ?? 0) / (sub?.creditsTotal ?? 50)) * 100);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>

      {/* Current Plan */}
      <div className="border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Current Plan</div>
            <div className="text-xl font-semibold text-gray-900">{isPro ? 'Pro' : 'Free Trial'}</div>
          </div>
          {isPro && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
          )}
        </div>

        {/* Credit balance */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              AI Credits
            </span>
            <span className="font-medium text-gray-900">
              {sub?.creditsRemaining ?? 0} / {sub?.creditsTotal ?? 50}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${creditPct}%` }}
            />
          </div>
          {isPro && sub?.creditsResetAt && (
            <p className="text-xs text-gray-400">
              Resets {new Date(sub.creditsResetAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {!isPro && (
          <div className="text-sm text-gray-600">
            {jobsRemaining > 0
              ? `${jobsRemaining} of ${sub?.trialLimit ?? 3} free trial job${jobsRemaining !== 1 ? 's' : ''} remaining.`
              : 'You have used all free trial jobs.'}
          </div>
        )}

        {isPro && (
          <div className="text-sm text-gray-600">
            {sub?.cancelAtPeriodEnd
              ? `Subscription ends ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'soon'}.`
              : `Renews ${sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}.`}
          </div>
        )}
      </div>

      {/* Credit cost reference */}
      <div className="border border-gray-100 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Credit Costs</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
          {[
            ['Resume Tailoring', 5],
            ['Cover Letter', 3],
            ['Interview Prep', 5],
            ['Sample Answer', 2],
            ['Answer Feedback', 2],
            ['Improve Summary', 1],
            ['Sample Job', 1],
          ].map(([label, cost]) => (
            <div key={label as string} className="flex items-center justify-between">
              <span>{label}</span>
              <span className="flex items-center gap-0.5 font-medium text-amber-600">
                <Zap className="w-3 h-3" />{cost}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isPro ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Manage your subscription, update payment method, or cancel via the Stripe Customer Portal.
          </p>
          <Button onClick={async () => {
            try { await openCustomerPortal(); }
            catch { addToast('Failed to open customer portal', 'error'); }
          }}>Open Customer Portal</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upgrade to Pro</h2>
          <p className="text-sm text-gray-600">Unlimited jobs. 750 AI credits/month. Cancel anytime.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="font-medium text-gray-900">Monthly</div>
              <div className="text-3xl font-bold text-gray-900">
                $9.99<span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
              <Button className="w-full" onClick={async () => {
                try { await startCheckout('monthly'); }
                catch { addToast('Failed to start checkout', 'error'); }
              }}>Choose Monthly</Button>
            </div>
            <div className="border-2 border-blue-500 rounded-lg p-4 space-y-3 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 34%
              </div>
              <div className="font-medium text-gray-900">Annual</div>
              <div className="text-3xl font-bold text-gray-900">
                $79<span className="text-sm font-normal text-gray-500">/yr</span>
              </div>
              <Button className="w-full" onClick={async () => {
                try { await startCheckout('annual'); }
                catch { addToast('Failed to start checkout', 'error'); }
              }}>Choose Annual</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add /billing route to App.tsx**

```tsx
import BillingPage from './pages/BillingPage';
// Inside protected routes:
<Route path="/billing" element={<BillingPage />} />
```

- [ ] **Step 3: Add Billing link + credit badge to Sidebar.tsx**

Add `{ label: 'Billing', href: '/billing', icon: CreditCard }` to the nav items list.

Near the user/bottom section of the sidebar, add a credit balance indicator:

```tsx
import { useAuth } from '../../context/AuthContext';
import { Zap } from 'lucide-react';

const { user } = useAuth();
const sub = user?.subscription;
const isPro = sub?.status === 'PRO';

// In JSX (near the user avatar / bottom of sidebar):
<div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1">
  <Zap className="w-3 h-3 text-amber-500" />
  <span>
    {isPro ? 'Pro' : 'Trial'} · {sub?.creditsRemaining ?? 50} credits
  </span>
</div>
```

- [ ] **Step 4: Manual test**

1. Navigate to `/billing` → confirm credit balance bar and credit cost table shown
2. Run an AI action (e.g. improve summary) → refresh `/billing` → credits decreased by 1
3. Confirm `⚡ 5` badge visible on Tailor Resume button

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/BillingPage.tsx client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add BillingPage with credit meter, cost table, and sidebar credit badge"
```

---

## Task 13: Admin Panel — Subscription + Credits Visibility

**Files:**
- Modify: `server/src/routes/admin/users.ts`
- Modify: `admin/src/api/admin.ts`
- Modify: `admin/src/pages/UserDetail.tsx`

- [ ] **Step 1: Add subscription to admin user detail endpoint**

In `server/src/routes/admin/users.ts`, the GET `/:id` handler has an existing `Promise.all`. Add the two new queries as the **last two elements** in the array and destructure them:

```typescript
// Add to end of existing Promise.all array:
prisma.subscription.findUnique({ where: { userId: id } }),
prisma.jobApplication.count({ where: { userId: id } }),

// Destructure: append subscription, jobsUsed to existing names
const [...existing, subscription, jobsUsed] = await Promise.all([...]);

// Add to response:
subscription: subscription
  ? { ...subscription, jobsUsed }
  : { status: 'TRIAL', creditsRemaining: 50, creditsTotal: 50, jobsUsed, trialLimit: 3 },
```

- [ ] **Step 2: Update admin.ts return type**

```typescript
subscription?: {
  status: 'TRIAL' | 'PRO' | 'EXPIRED';
  creditsRemaining: number;
  creditsTotal: number;
  jobsUsed: number;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};
```

- [ ] **Step 3: Show subscription in UserDetail.tsx**

```tsx
{user.subscription && (
  <div className="bg-white rounded border border-gray-200 p-4">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">Subscription</h3>
    <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
      <span>Status: <strong>{user.subscription.status}</strong></span>
      <span>Credits: <strong>{user.subscription.creditsRemaining} / {user.subscription.creditsTotal}</strong></span>
      <span>Jobs used: <strong>{user.subscription.jobsUsed}</strong></span>
      {user.subscription.currentPeriodEnd && (
        <span>Renews: <strong>{new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</strong></span>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/admin/users.ts admin/src/api/admin.ts admin/src/pages/UserDetail.tsx
git commit -m "feat: show subscription and credit balance in admin user detail"
```

---

## Task 14: Stripe Dashboard Setup

This is a config task — no code changes.

- [ ] **Step 1: Create Stripe products (test mode)**
  1. Product: "Resume App Pro"
  2. Price: $9.99/month → copy ID → `STRIPE_PRICE_MONTHLY`
  3. Price: $79/year → copy ID → `STRIPE_PRICE_ANNUAL`

- [ ] **Step 2: Configure webhook**
  1. Add endpoint: `https://your-domain.com/api/billing/webhook`
  2. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 3: Test webhook locally**

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
# In another terminal:
stripe trigger customer.subscription.created
```
Expected: Subscription status updates in DB, `creditsRemaining` set to 750.

- [ ] **Step 4: Enable Customer Portal**

Dashboard → Billing → Customer Portal → Activate. Allow plan changes, cancellation, invoice history.

---

## Verification Checklist

- [ ] New user signs up → `Subscription` created with `TRIAL` status, `creditsRemaining: 50`
- [ ] `/billing` shows "50 / 50" credit bar
- [ ] `⚡ 5` badge visible on Tailor Resume button, `⚡ 3` on Cover Letter, etc.
- [ ] Run "Improve Summary" → credits decrease by 1 → sidebar shows updated count
- [ ] Run "Tailor Resume" → credits decrease by 5
- [ ] Exhaust credits → AI action returns 402 with error toast "Not enough credits"
- [ ] Create 1st, 2nd, 3rd job → succeeds
- [ ] Create 4th job → `UpgradeModal` appears (trial job limit)
- [ ] "Choose Monthly" → Stripe Checkout → complete test payment → redirect back
- [ ] After upgrade: subscription shows Pro, credits show 750/750, reset date shown
- [ ] Pro user creates 4th+ job → succeeds
- [ ] Pro user runs AI → credits decrease from 750
- [ ] Customer Portal opens, cancel flow works
- [ ] Cancel via portal → `customer.subscription.updated` fires → `cancelAtPeriodEnd: true`
- [ ] After period ends → `customer.subscription.deleted` fires → status `EXPIRED`
- [ ] Admin UserDetail shows status, credit balance, jobs used

---

## Credit Cost Reference (server + client)

| Action | Credits | Middleware | Client badge |
|---|---|---|---|
| Resume tailoring | 5 | `requireCredits(5)` on `POST /api/ai/tailor` | `JobDetailPage` |
| Cover letter | 3 | `requireCredits(3)` on `POST /api/ai/cover-letter` | `JobDetailPage` |
| Interview categories | 0 (free) | No middleware — discovery step | — |
| Interview questions | 5 | `requireCredits(5)` on `POST /api/ai/interview-questions` | `InterviewPrepPanel` |
| Sample response | 2 | `requireCredits(2)` on `POST /api/ai/interview-sample-response` | `InterviewQuestionsView` |
| Answer feedback | 2 | `requireCredits(2)` on `POST /api/ai/interview-feedback` | `InterviewQuestionsView` |
| Summary improvement | 1 | `requireCredits(1)` on `POST /api/ai/improve-summary` | `ProfilePage` |
| Sample job generate | 1 | `requireCredits(1)` on `POST /api/ai/sample-job` | `JobDetailPage` |
