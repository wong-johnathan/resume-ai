import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { logActivity, ActivityAction } from '../../services/activityLog';

const router = Router();

// GET /api/admin/resumes?page=1&limit=20&status=DRAFT
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          templateId: true,
          tailoredFor: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.resume.count({ where }),
    ]);

    res.json({ data: resumes, total, page, pageCount: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// DELETE /api/admin/resumes/:resumeId
router.delete('/:resumeId', async (req, res, next) => {
  try {
    const { resumeId } = req.params;

    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    // Log BEFORE delete — snapshot key fields
    await logActivity(resume.userId, ActivityAction.RESUME_DELETED, {
      resumeId: resume.id,
      title: resume.title,
      templateId: resume.templateId,
      status: resume.status,
      createdAt: resume.createdAt,
    });

    await prisma.resume.delete({ where: { id: resumeId } });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
