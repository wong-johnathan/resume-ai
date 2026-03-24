import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { logActivity, ActivityAction } from '../services/activityLog';

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
  fitAnalysis: z.any().optional(),
});

const updateJobSchema = createJobSchema.partial();

const updateHistoryNoteSchema = z.object({
  note: z.string().max(1000).nullable(),
});

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
    logActivity(getUser(req).id, ActivityAction.JOB_CREATED, {
      jobId: job.id,
      company: job.company,
      jobTitle: job.jobTitle,
    }).catch(() => {});
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
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(updateJobSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const id = req.params.id as string;

    // Ownership check + read current status before updating
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const isStatusChanging =
      req.body.status !== undefined && req.body.status !== existing.status;

    const updateData = {
      ...req.body,
      appliedAt: req.body.appliedAt ? new Date(req.body.appliedAt) : undefined,
      ...(req.body.status !== undefined ? { statusUpdatedAt: new Date() } : {}),
    };

    if (isStatusChanging) {
      // Atomic: update job + write history in one transaction
      await prisma.$transaction(async (tx) => {
        await tx.jobApplication.update({ where: { id }, data: updateData });
        await tx.jobStatusHistory.create({
          data: {
            jobId: id,
            fromStatus: existing.status,
            toStatus: req.body.status,
          },
        });
      });
    } else {
      await prisma.jobApplication.update({ where: { id }, data: updateData });
    }

    // Fetch final state with all includes
    const updated = await prisma.jobApplication.findFirst({
      where: { id, userId },
      include: {
        resume: true,
        aiAmendments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!updated) return res.status(404).json({ error: 'Job not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const job = await prisma.jobApplication.findFirst({ where: { id: req.params.id, userId } });
    if (job) {
      await logActivity(userId, ActivityAction.JOB_DELETED, {
        jobId: job.id,
        company: job.company,
        jobTitle: job.jobTitle,
      });
    }
    await prisma.jobApplication.deleteMany({ where: { id: req.params.id, userId } });
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

router.patch('/:id/status-history/:historyId', validateBody(updateHistoryNoteSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const entry = await prisma.jobStatusHistory.findFirst({
      where: { id: req.params.historyId as string, job: { userId } },
    });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.jobStatusHistory.update({
      where: { id: entry.id },
      data: { note: req.body.note },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id/status-history/:historyId', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const entry = await prisma.jobStatusHistory.findFirst({
      where: { id: req.params.historyId as string, job: { userId } },
    });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await prisma.jobStatusHistory.delete({ where: { id: entry.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
