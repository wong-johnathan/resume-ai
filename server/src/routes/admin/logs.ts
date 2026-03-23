import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/logs?page=1&limit=50&userId=x&action=LOGIN
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as ActivityAction | undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Enrich logs with user email for display (best-effort — user may be deleted)
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, displayName: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = logs.map((log) => ({
      ...log,
      user: userMap[log.userId] ?? { id: log.userId, email: '[deleted]', displayName: null },
    }));

    res.json({ data: enriched, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
