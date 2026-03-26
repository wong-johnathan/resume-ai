import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { logActivity, ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/users?page=1&limit=20&search=email
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) ?? '';
    const skip = (page - 1) * limit;

    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          lastActiveAt: true,
          _count: { select: { resumes: true, jobApplications: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/admin/users/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user, resumes, jobs, aiAmendmentCount, activityLog, aiTailor, aiCoverLetter, aiInterviewPrep, aiSummary, subscription, jobsUsed] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.resume.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true, templateId: true, tailoredFor: true, createdAt: true },
      }),
      prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, company: true, jobTitle: true, status: true, appliedAt: true, createdAt: true },
      }),
      prisma.activityLog.count({
        where: { userId, action: { in: [ActivityAction.AI_TAILOR, ActivityAction.AI_COVER_LETTER] } },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_TAILOR } }),
      prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_COVER_LETTER } }),
      prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_INTERVIEW_PREP } }),
      prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_SUMMARY } }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.jobApplication.count({ where: { userId } }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const aiUsage = { tailor: aiTailor, coverLetter: aiCoverLetter, interviewPrep: aiInterviewPrep, summary: aiSummary };

    res.json({
      user,
      resumes,
      jobs,
      aiAmendmentCount,
      aiUsage,
      activityLog,
      subscription: subscription
        ? { ...subscription, jobsUsed }
        : { status: 'TRIAL', creditsRemaining: 50, creditsTotal: 50, jobsUsed, trialLimit: 3 },
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users/:userId/jobs/:jobId
router.get('/:userId/jobs/:jobId', async (req, res, next) => {
  try {
    const { userId, jobId } = req.params;
    const job = await prisma.jobApplication.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/credits
router.post('/:id/credits', async (req, res, next) => {
  try {
    const { id } = req.params;
    const credits = Number(req.body.credits);

    if (!Number.isInteger(credits) || credits < 0 || credits > 10000) {
      return res.status(400).json({ error: 'credits must be an integer between 0 and 10000' });
    }

    const sub = await prisma.subscription.upsert({
      where: { userId: id },
      update: { creditsRemaining: credits },
      create: { userId: id, creditsRemaining: credits },
    });

    res.json({ creditsRemaining: sub.creditsRemaining });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:userId
router.delete('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Log BEFORE delete — snapshot key fields so record persists after cascade
    await logActivity(userId, ActivityAction.ACCOUNT_DELETED, {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });

    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
