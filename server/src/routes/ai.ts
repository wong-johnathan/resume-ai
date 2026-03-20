import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { tailorResume, generateCoverLetter, improveSummary } from '../services/claude';

const router = Router();
router.use(requireAuth);

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => getUser(req).id,
  message: { error: 'Too many AI requests, please wait 15 minutes before trying again.' },
});

router.use(aiRateLimit);

// ─── Tailor resume ───────────────────────────────────────────────────────────

const tailorSchema = z.object({
  resumeId: z.string(),
  jobDescription: z.string().min(50),
  jobId: z.string().optional(),
});

const AI_AMENDMENT_LIMIT = 3;

router.post('/tailor', validateBody(tailorSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    // Check amendment limit if a jobId is provided
    if (req.body.jobId) {
      const amendmentCount = await prisma.aiAmendment.count({
        where: { jobApplicationId: req.body.jobId },
      });
      if (amendmentCount >= AI_AMENDMENT_LIMIT) {
        return res.status(403).json({ error: `AI amendment limit of ${AI_AMENDMENT_LIMIT} reached for this job posting.` });
      }
    }

    // Only allow tailoring original resumes (not already-tailored clones)
    const original = await prisma.resume.findFirst({
      where: { id: req.body.resumeId, userId, tailoredFor: null },
    });
    if (!original) return res.status(404).json({ error: 'Resume not found' });

    const tailoredContent = await tailorResume(original.contentJson as any, req.body.jobDescription);

    // Create a clone with the tailored content — original is untouched
    const clone = await prisma.resume.create({
      data: {
        userId,
        title: `${original.title} (Tailored)`,
        templateId: original.templateId,
        contentJson: tailoredContent as any,
        tailoredFor: req.body.jobId ?? 'job',
      },
    });

    // Link the clone to the job application and record the amendment
    if (req.body.jobId) {
      await prisma.jobApplication.updateMany({
        where: { id: req.body.jobId, userId },
        data: { resumeId: clone.id },
      });
      await prisma.aiAmendment.create({
        data: {
          jobApplicationId: req.body.jobId,
          type: 'RESUME_TAILOR',
          resumeId: clone.id,
        },
      });
    }

    res.json(clone);
  } catch (err) { next(err); }
});

// ─── Cover letter (SSE streaming) ────────────────────────────────────────────

const coverLetterSchema = z.object({
  jobDescription: z.string().min(50),
  tone: z.enum(['Professional', 'Conversational', 'Enthusiastic']).default('Professional'),
  jobId: z.string().optional(),
});

router.post('/cover-letter', validateBody(coverLetterSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    // Check amendment limit if a jobId is provided
    if (req.body.jobId) {
      const amendmentCount = await prisma.aiAmendment.count({
        where: { jobApplicationId: req.body.jobId },
      });
      if (amendmentCount >= AI_AMENDMENT_LIMIT) {
        return res.status(403).json({ error: `AI amendment limit of ${AI_AMENDMENT_LIMIT} reached for this job posting.` });
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: { take: 8 } },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let generatedText = '';
    await generateCoverLetter(profile as any, req.body.jobDescription, req.body.tone, (chunk: string) => {
      generatedText += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    // Record the amendment after successful generation
    if (req.body.jobId) {
      await prisma.aiAmendment.create({
        data: {
          jobApplicationId: req.body.jobId,
          type: 'COVER_LETTER',
          coverLetterText: generatedText,
        },
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) { next(err); }
});

// ─── Improve summary ─────────────────────────────────────────────────────────

const summarySchema = z.object({
  currentSummary: z.string(),
  targetRole: z.string().min(2),
});

router.post('/improve-summary', validateBody(summarySchema), async (req, res, next) => {
  try {
    const improved = await improveSummary(req.body.currentSummary, req.body.targetRole);
    res.json({ summary: improved });
  } catch (err) { next(err); }
});

export default router;
