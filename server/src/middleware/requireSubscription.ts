import { RequestHandler } from 'express';
import { prisma } from '../config/prisma';

export const requireSubscription: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.user as any)!.id;

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
