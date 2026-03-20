import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';

const router = Router();
router.use(requireAuth);

const createJobSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  jobUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  status: z.string().min(1).default('SAVED'),
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
  coverLetter: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  resumeId: z.string().optional(),
});

const updateJobSchema = createJobSchema.partial();

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const jobs = await prisma.jobApplication.findMany({
      where: { userId: getUser(req).id, ...(status ? { status: status as any } : {}) },
      include: { resume: { select: { id: true, title: true, templateId: true, tailoredFor: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

router.post('/', validateBody(createJobSchema), async (req, res, next) => {
  try {
    const job = await prisma.jobApplication.create({
      data: {
        ...req.body,
        userId: getUser(req).id,
        appliedAt: req.body.appliedAt ? new Date(req.body.appliedAt) : null,
      },
    });
    res.status(201).json(job);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.jobApplication.findFirst({
      where: { id: req.params.id, userId: getUser(req).id },
      include: {
        resume: true,
        aiAmendments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(updateJobSchema), async (req, res, next) => {
  try {
    const job = await prisma.jobApplication.updateMany({
      where: { id: req.params.id as string, userId: getUser(req).id },
      data: { ...req.body, appliedAt: req.body.appliedAt ? new Date(req.body.appliedAt) : undefined },
    });
    if (job.count === 0) return res.status(404).json({ error: 'Job not found' });
    const updated = await prisma.jobApplication.findUnique({
      where: { id: req.params.id as string },
      include: { resume: true, aiAmendments: { orderBy: { createdAt: 'desc' } } },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.jobApplication.deleteMany({ where: { id: req.params.id, userId: getUser(req).id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/:id/resume', async (req, res, next) => {
  try {
    const { resumeId } = req.body;
    const job = await prisma.jobApplication.updateMany({
      where: { id: req.params.id, userId: getUser(req).id },
      data: { resumeId: resumeId ?? null },
    });
    if (job.count === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
