import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { requireSubscription } from '../middleware/requireSubscription';
import { validateBody } from '../middleware/validateBody';
import { logActivity, ActivityAction } from '../services/activityLog';
import { extractJobFromText } from '../services/claude';

const router = Router();
router.use(requireAuth);

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => getUser(req).id,
  message: { error: 'Too many AI requests, please wait 15 minutes before trying again.' },
});
router.use(aiRateLimit);

const saveJobSchema = z.object({
  pageText: z.string().min(1).max(100000),
  pageUrl: z.string().url(),
});

router.post('/', requireSubscription, validateBody(saveJobSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const { pageText, pageUrl } = req.body;

    let extracted;
    try {
      extracted = await extractJobFromText(pageText, pageUrl);
    } catch (err: any) {
      if (err?.code === 'NOT_JOB_POSTING') {
        return res.status(422).json({ error: 'not_a_job_posting', message: "Couldn't detect a job on this page" });
      }
      return next(err);
    }

    const job = await prisma.$transaction(async (tx: any) => {
      const created = await tx.jobApplication.create({
        data: {
          userId,
          company: extracted.company,
          jobTitle: extracted.jobTitle,
          jobUrl: extracted.jobUrl,
          description: extracted.description,
          salary: extracted.salary ?? undefined,
          location: extracted.location ?? undefined,
          status: 'SAVED',
        },
      });
      await tx.jobOutput.create({ data: { jobId: created.id, userId } });
      return created;
    });

    logActivity(userId, ActivityAction.JOB_CREATED, {
      jobId: job.id,
      company: job.company,
      jobTitle: job.jobTitle,
      source: 'chrome_extension',
    }).catch(() => {});

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
