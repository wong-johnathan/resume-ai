import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

const TOUR_IDS = ['jobs-list', 'job-detail', 'job-prep'] as const;
const tourIdSchema = z.enum(TOUR_IDS);

// GET /api/tours — return current completion map
router.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const toursCompleted = (profile?.toursCompleted ?? {}) as Record<string, string>;
    res.json({ toursCompleted });
  } catch (err) { next(err); }
});

// POST /api/tours/:tourId/complete — mark a tour done
router.post('/:tourId/complete', async (req, res, next) => {
  try {
    const parsed = tourIdSchema.safeParse(req.params.tourId);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid tour ID' });
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const current = (profile?.toursCompleted ?? {}) as Record<string, string>;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const updated = { ...current, [parsed.data]: new Date().toISOString() };
    await prisma.profile.update({
      where: { userId: getUser(req).id },
      data: { toursCompleted: updated },
    });
    res.json({ toursCompleted: updated });
  } catch (err) { next(err); }
});

// DELETE /api/tours/:tourId/complete — reset a tour so it re-triggers
router.delete('/:tourId/complete', async (req, res, next) => {
  try {
    const parsed = tourIdSchema.safeParse(req.params.tourId);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid tour ID' });
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const current = { ...(profile?.toursCompleted ?? {}) as Record<string, string> };
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    delete current[parsed.data];
    await prisma.profile.update({
      where: { userId: getUser(req).id },
      data: { toursCompleted: current },
    });
    res.json({ toursCompleted: current });
  } catch (err) { next(err); }
});

export default router;
