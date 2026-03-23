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

    const [user, resumes, jobs, aiAmendmentCount, activityLog] = await Promise.all([
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
      prisma.aiAmendment.count({
        where: { jobApplication: { userId } },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const aiUsage = {
      tailor: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_TAILOR } }),
      coverLetter: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_COVER_LETTER } }),
      interviewPrep: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_INTERVIEW_PREP } }),
      summary: await prisma.activityLog.count({ where: { userId, action: ActivityAction.AI_SUMMARY } }),
    };

    res.json({ user, resumes, jobs, aiAmendmentCount, aiUsage, activityLog });
  } catch (err) { next(err); }
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
