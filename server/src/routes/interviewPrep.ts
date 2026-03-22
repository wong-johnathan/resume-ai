import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { prisma } from '../config/prisma';
import { InterviewCategory } from '../services/claude';

const router = Router();
router.use(requireAuth);

// GET /api/interview-prep/:jobId
router.get('/:jobId', async (req, res, next) => {
  try {
    const user = getUser(req);
    const prep = await prisma.interviewPrep.findFirst({
      where: { jobId: req.params.jobId, userId: user.id },
    });
    res.json(prep ?? null);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interview-prep/:jobId
router.delete('/:jobId', async (req, res, next) => {
  try {
    const user = getUser(req);
    await prisma.interviewPrep.deleteMany({
      where: { jobId: req.params.jobId, userId: user.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interview-prep/:jobId/clear-answer
router.patch(
  '/:jobId/clear-answer',
  validateBody(z.object({ categoryName: z.string(), questionIndex: z.number().int().min(0) })),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { categoryName, questionIndex } = req.body;

      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId: req.params.jobId as string, userId: user.id },
      });
      if (!prep) return res.status(404).json({ error: 'Not found' });

      const categories = prep.categories as unknown as InterviewCategory[];
      const category = categories.find((c) => c.name === categoryName);
      if (category && category.questions[questionIndex]) {
        delete category.questions[questionIndex].userAnswer;
        delete category.questions[questionIndex].feedback;
      }

      const updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data: { categories: categories as any },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
