import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import {
  stripe,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
} from '../services/stripe';
import { logActivity } from '../services/activityLog';
import { ActivityAction } from '@prisma/client';
import { getUser } from '../middleware/requireAuth';

const router = Router();

const checkoutSchema = z.object({
  priceId: z.enum(['monthly', 'annual']),
});

// GET /api/billing/status
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUser(req).id;
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
    const userId = getUser(req).id;
    const user = getUser(req);
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
    const userId = getUser(req).id;
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

    // In Stripe v21, current_period_end/start are on the SubscriptionItem, not the Subscription root.
    const firstItem = stripeSubscription.items.data[0];
    const periodEnd = firstItem?.current_period_end ?? 0;
    const periodStart = firstItem?.current_period_start ?? 0;

    const nextReset = new Date(periodEnd * 1000);
    const incomingPeriodStart = new Date(periodStart * 1000);

    // Only reset credits when the billing period actually advances (renewal) or on first activation.
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
        stripePriceId: firstItem?.price.id ?? null,
        currentPeriodStart: incomingPeriodStart,
        currentPeriodEnd: nextReset,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    if (isActive) {
      await logActivity(sub.userId, ActivityAction.SUBSCRIPTION_UPGRADED, {
        stripeSubscriptionId: stripeSubscription.id,
        priceId: firstItem?.price.id,
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
