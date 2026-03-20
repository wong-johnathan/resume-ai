import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';

const router = Router();
router.use(requireAuth);

const DEFAULT_STATUSES = [
  { label: 'SAVED',        color: '#6b7280', order: 0 },
  { label: 'APPLIED',      color: '#3b82f6', order: 1 },
  { label: 'PHONE_SCREEN', color: '#8b5cf6', order: 2 },
  { label: 'INTERVIEW',    color: '#f97316', order: 3 },
  { label: 'OFFER',        color: '#22c55e', order: 4 },
  { label: 'REJECTED',     color: '#ef4444', order: 5 },
  { label: 'WITHDRAWN',    color: '#9ca3af', order: 6 },
];

const DEFAULT_LABELS = new Set(DEFAULT_STATUSES.map((s) => s.label));

async function ensureDefaults(userId: string) {
  const count = await prisma.userJobStatus.count({ where: { userId } });
  if (count === 0) {
    await prisma.userJobStatus.createMany({
      data: DEFAULT_STATUSES.map((s) => ({ ...s, userId })),
    });
  }
}

// GET /api/job-statuses
router.get('/', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    await ensureDefaults(userId);
    const statuses = await prisma.userJobStatus.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });
    res.json(statuses);
  } catch (err) { next(err); }
});

const createSchema = z.object({
  label: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
});

// POST /api/job-statuses
router.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const maxOrder = await prisma.userJobStatus.aggregate({ where: { userId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;
    const status = await prisma.userJobStatus.create({
      data: { userId, label: req.body.label, color: req.body.color, order },
    });
    res.status(201).json(status);
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'A status with that name already exists' });
    next(err);
  }
});

const updateSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.number().int().optional(),
});

// PUT /api/job-statuses/:id
router.put('/:id', validateBody(updateSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const id = req.params.id as string;
    const updated = await prisma.userJobStatus.updateMany({
      where: { id, userId },
      data: req.body,
    });
    if (updated.count === 0) return res.status(404).json({ error: 'Status not found' });
    const result = await prisma.userJobStatus.findUnique({ where: { id } });
    res.json(result);
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'A status with that name already exists' });
    next(err);
  }
});

// DELETE /api/job-statuses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const status = await prisma.userJobStatus.findFirst({ where: { id: req.params.id, userId } });
    if (!status) return res.status(404).json({ error: 'Status not found' });
    if (DEFAULT_LABELS.has(status.label)) return res.status(403).json({ error: 'Default statuses cannot be deleted' });
    const inUse = await prisma.jobApplication.count({ where: { userId, status: status.label } });
    if (inUse > 0) return res.status(409).json({ error: `Cannot delete — ${inUse} job(s) use this status` });
    await prisma.userJobStatus.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/job-statuses/reorder — bulk reorder
router.post('/reorder', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const ids: string[] = req.body.ids;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
    await Promise.all(ids.map((id, i) =>
      prisma.userJobStatus.updateMany({ where: { id, userId }, data: { order: i } })
    ));
    const statuses = await prisma.userJobStatus.findMany({ where: { userId }, orderBy: { order: 'asc' } });
    res.json(statuses);
  } catch (err) { next(err); }
});

export default router;
