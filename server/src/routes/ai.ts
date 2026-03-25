import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { tailorResume, generateCoverLetter, improveSummary, generateSummary, extractJobInfo, analyzeJobFit, generateInterviewCategories, generateInterviewQuestions, evaluateInterviewAnswer, generateSampleResponse, generateSampleJobTitles, generateSampleJob, InterviewCategory, InterviewFeedback } from '../services/claude';
import { profileToResumeContent } from '../utils/profileToContent';
import { logActivity, ActivityAction } from '../services/activityLog';

const router = Router();
router.use(requireAuth);

// ─── Sample job status (DB-only, no rate limit) ───────────────────────────────

const SAMPLE_JOB_LIMIT = 3;

router.get('/sample-job-status', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { sampleJobsGenerated: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ generationsUsed: profile.sampleJobsGenerated, generationsLimit: SAMPLE_JOB_LIMIT });
  } catch (err) { next(err); }
});

// ─── Sample job titles (AI call, but exempt from rate limit) ─────────────────

router.post('/sample-titles', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const titles = await generateSampleJobTitles({
      summary: profile.summary,
      experiences: profile.experiences.map((e) => ({ title: e.title, company: e.company })),
      skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
    });

    res.json({ titles, generationsUsed: profile.sampleJobsGenerated, generationsLimit: SAMPLE_JOB_LIMIT });
  } catch (err) { next(err); }
});

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => getUser(req).id,
  message: { error: 'Too many AI requests, please wait 15 minutes before trying again.' },
});

router.use(aiRateLimit);

// ─── Tailor resume ───────────────────────────────────────────────────────────

const tailorSchema = z.object({
  jobId: z.string(),
});

router.post('/tailor', validateBody(tailorSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const { jobId } = req.body;

    // Ownership check
    const job = await prisma.jobApplication.findFirst({ where: { id: jobId, userId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.description) return res.status(400).json({ error: 'Job has no description' });

    // Check version limit
    const jobOutput = await prisma.jobOutput.findUnique({ where: { jobId } });
    const currentVersion = jobOutput?.resumeVersion ?? 0;
    if (currentVersion >= 3) {
      return res.status(403).json({ error: 'Resume tailor limit of 3 reached for this job.' });
    }

    // Build profile content
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' } }, educations: { orderBy: { order: 'asc' } }, skills: true, certifications: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const profileContent = profileToResumeContent(profile);

    // AI call — only need tailored content, not changes
    const { tailored } = await tailorResume(profileContent, job.description);

    // Upsert JobOutput with new resumeJson and increment version
    const updated = await prisma.jobOutput.upsert({
      where: { jobId },
      create: { jobId, userId, resumeJson: tailored as any, resumeVersion: 1 },
      update: { resumeJson: tailored as any, resumeVersion: { increment: 1 } },
    });

    logActivity(userId, ActivityAction.AI_TAILOR, { jobId }).catch(() => {});
    res.json(updated);
  } catch (err) { next(err); }
});

// ─── Cover letter (SSE streaming) ────────────────────────────────────────────

const coverLetterSchema = z.object({
  jobId: z.string(),
  tone: z.enum(['Professional', 'Conversational', 'Enthusiastic']).default('Professional'),
});

router.post('/cover-letter', validateBody(coverLetterSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const { jobId, tone } = req.body;

    const job = await prisma.jobApplication.findFirst({ where: { id: jobId, userId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.description) return res.status(400).json({ error: 'Job has no description' });

    // Check version limit BEFORE starting stream
    const jobOutput = await prisma.jobOutput.findUnique({ where: { jobId } });
    const currentVersion = jobOutput?.coverLetterVersion ?? 0;
    if (currentVersion >= 3) {
      return res.status(403).json({ error: 'Cover letter generation limit of 3 reached for this job.' });
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
    let streamAborted = false;
    req.on('close', () => { streamAborted = true; });

    await generateCoverLetter(profile as any, job.description, tone, (chunk: string) => {
      generatedText += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    // Only persist and increment version on successful stream completion
    if (!streamAborted) {
      await prisma.jobOutput.upsert({
        where: { jobId },
        create: { jobId, userId, coverLetterText: generatedText, coverLetterVersion: 1 },
        update: { coverLetterText: generatedText, coverLetterVersion: { increment: 1 } },
      });
    }

    logActivity(userId, ActivityAction.AI_COVER_LETTER, { jobId }).catch(() => {});
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) { next(err); }
});

// ─── Crawl URL and extract job info ──────────────────────────────────────────

const crawlUrlSchema = z.object({
  url: z.string().url(),
});

router.post('/crawl-url', validateBody(crawlUrlSchema), async (req, res, next) => {
  try {
    const jinaUrl = `https://r.jina.ai/${req.body.url}`;
    const response = await fetch(jinaUrl, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return res.status(422).json({ error: 'Failed to fetch the URL. Please paste the job description manually.' });
    }
    const rawText = await response.text();

    // Detect auth-gated pages (e.g. LinkedIn login wall)
    const lowerText = rawText.toLowerCase();
    const isLoginPage = lowerText.includes('sign in') && lowerText.includes('password') && rawText.length < 5000;
    const isTooShort = rawText.trim().length < 200;
    if (isLoginPage || isTooShort) {
      return res.status(422).json({ error: 'This page requires a login to view. Copy and paste the job description manually instead.' });
    }

    const jobInfo = await extractJobInfo(rawText);

    // Ensure we got something useful back
    if (!jobInfo.description || jobInfo.description.trim().length < 50) {
      return res.status(422).json({ error: 'Could not extract job details from this page. Paste the job description manually.' });
    }

    res.json(jobInfo);
  } catch (err) { next(err); }
});

// ─── Analyze job fit ──────────────────────────────────────────────────────────

const analyzeFitSchema = z.object({
  jobDescription: z.string().min(50),
});

router.post('/analyze-fit', validateBody(analyzeFitSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const result = await analyzeJobFit({
      jobDescription: req.body.jobDescription,
      resumeContent: undefined,
      profile: {
        summary: profile.summary,
        experiences: profile.experiences.map((e) => ({
          title: e.title,
          company: e.company,
          description: e.description,
        })),
        skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
      },
    });

    res.json(result);
  } catch (err) { next(err); }
});

// ─── Generate summary from scratch ───────────────────────────────────────────

const generateSummarySchema = z.object({
  targetRole: z.string().min(2),
  experiences: z.array(z.object({
    title: z.string(),
    company: z.string(),
    description: z.string(),
  })).optional().default([]),
  skills: z.array(z.object({ name: z.string() })).optional().default([]),
});

const SUMMARY_GENERATION_LIMIT = 4;

router.post('/generate-summary', validateBody(generateSummarySchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true, summaryGenerations: true } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (profile.summaryGenerations >= SUMMARY_GENERATION_LIMIT) {
      return res.status(403).json({ error: `Summary generation limit of ${SUMMARY_GENERATION_LIMIT} reached.` });
    }

    const summary = await generateSummary(req.body.targetRole, req.body.experiences, req.body.skills);

    await prisma.profile.update({
      where: { id: profile.id },
      data: { summaryGenerations: { increment: 1 } },
    });

    logActivity(userId, ActivityAction.AI_SUMMARY).catch(() => {});
    res.json({ summary, generationsUsed: profile.summaryGenerations + 1, generationsLimit: SUMMARY_GENERATION_LIMIT });
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
    logActivity(getUser(req).id, ActivityAction.AI_SUMMARY).catch(() => {});
    res.json({ summary: improved });
  } catch (err) { next(err); }
});

// ─── Generate interview categories ───────────────────────────────────────────

router.post(
  '/interview-categories',
  validateBody(z.object({ jobId: z.string() })),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { jobId } = req.body;

      const job = await prisma.jobApplication.findFirst({
        where: { id: jobId, userId: user.id },
      });
      if (!job || !job.description) {
        return res.status(404).json({ error: 'Job not found or has no description' });
      }

      const profile = await prisma.profile.findFirst({
        where: { userId: user.id },
        include: {
          experiences: { orderBy: { order: 'asc' }, take: 3 },
          skills: { take: 10 },
        },
      });

      const categories = await generateInterviewCategories(job.description, {
        summary: profile?.summary,
        experiences: profile?.experiences ?? [],
        skills: profile?.skills ?? [],
      });

      res.json({ categories });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Generate interview questions ─────────────────────────────────────────────

router.post(
  '/interview-questions',
  validateBody(
    z.object({
      jobId: z.string(),
      selections: z
        .array(z.object({ name: z.string(), questionCount: z.number().min(3).max(10) }))
        .min(1),
    })
  ),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { jobId, selections } = req.body;

      const job = await prisma.jobApplication.findFirst({
        where: { id: jobId, userId: user.id },
      });
      if (!job || !job.description) {
        return res.status(404).json({ error: 'Job not found or has no description' });
      }

      const profile = await prisma.profile.findFirst({
        where: { userId: user.id },
        include: {
          experiences: { orderBy: { order: 'asc' }, take: 3 },
          skills: { take: 10 },
        },
      });

      const generatedCategories = await generateInterviewQuestions(
        job.description,
        {
          summary: profile?.summary,
          experiences: profile?.experiences ?? [],
          skills: profile?.skills ?? [],
        },
        selections
      );

      // Merge questionCount from selections into the returned categories
      const categories: InterviewCategory[] = generatedCategories.map((cat) => {
        const sel = selections.find((s: { name: string; questionCount: number }) => s.name === cat.name);
        return { name: cat.name, questionCount: sel?.questionCount ?? cat.questions.length, questions: cat.questions };
      });

      const prep = await prisma.interviewPrep.upsert({
        where: { jobId },
        create: { jobId, userId: user.id, categories: categories as any },
        update: { categories: categories as any },
      });

      logActivity(user.id, ActivityAction.INTERVIEW_PREP_GENERATED, { jobId }).catch(() => {});
      res.json(prep);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Evaluate interview answer ─────────────────────────────────────────────────

router.post(
  '/interview-feedback',
  validateBody(
    z.object({
      jobId: z.string(),
      categoryName: z.string().min(1),
      questionIndex: z.number().int().min(0),
      question: z.string().min(1),
      answer: z.string().min(1).max(5000),
    })
  ),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { jobId, categoryName, questionIndex, question, answer } = req.body;

      const job = await prisma.jobApplication.findFirst({
        where: { id: jobId, userId: user.id },
      });
      if (!job || !job.description) {
        return res.status(404).json({ error: 'Job not found or has no description' });
      }

      const feedback: InterviewFeedback = await evaluateInterviewAnswer(
        question,
        answer,
        job.description,
        categoryName
      );

      // Ownership verified: job belongs to user (checked above). Load prep scoped to same user.
      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId, userId: user.id },
      });
      if (!prep) {
        return res.status(404).json({ error: 'Interview prep not found' });
      }

      const categories = prep.categories as unknown as InterviewCategory[];
      const category = categories.find((c) => c.name === categoryName);
      if (!category || !category.questions[questionIndex]) {
        return res.status(404).json({ error: 'Question not found' });
      }

      category.questions[questionIndex].userAnswer = answer;
      category.questions[questionIndex].feedback = feedback;

      const updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data: { categories: categories as any },
      });

      res.json({ feedback, prep: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Generate sample interview response ───────────────────────────────────────

router.post(
  '/interview-sample-response',
  validateBody(
    z.object({
      jobId: z.string(),
      categoryName: z.string().min(1),
      questionIndex: z.number().int().min(0),
      question: z.string().min(1),
    })
  ),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { jobId, categoryName, questionIndex, question } = req.body;

      const job = await prisma.jobApplication.findFirst({
        where: { id: jobId, userId: user.id },
      });
      if (!job || !job.description) {
        return res.status(404).json({ error: 'Job not found or has no description' });
      }

      // Check before the AI call so we don't waste a generation
      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId, userId: user.id },
      });
      if (!prep) {
        return res.status(404).json({ error: 'Interview prep not found' });
      }

      const categories = prep.categories as unknown as InterviewCategory[];
      const category = categories.find((c) => c.name === categoryName);
      if (!category || !category.questions[questionIndex]) {
        return res.status(404).json({ error: 'Question not found' });
      }

      if ((category.questions[questionIndex] as any).sampleResponse) {
        return res.status(409).json({ error: 'Sample response already generated for this question' });
      }

      const profile = await prisma.profile.findFirst({
        where: { userId: user.id },
        include: {
          experiences: { orderBy: { order: 'asc' }, take: 3 },
          skills: { take: 10 },
        },
      });

      const sampleResponse = await generateSampleResponse(
        question,
        job.description,
        categoryName,
        {
          summary: profile?.summary,
          experiences: profile?.experiences ?? [],
          skills: profile?.skills ?? [],
        }
      );

      (category.questions[questionIndex] as any).sampleResponse = sampleResponse;

      const updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data: { categories: categories as any },
      });

      res.json({ sampleResponse, prep: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Generate sample job ──────────────────────────────────────────────────────

const sampleJobSchema = z.object({
  jobTitle: z.string().min(2),
});

router.post('/sample-job', validateBody(sampleJobSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (profile.sampleJobsGenerated >= SAMPLE_JOB_LIMIT) {
      return res.status(403).json({ error: `Sample job limit of ${SAMPLE_JOB_LIMIT} reached.` });
    }

    // AI call outside the transaction — if it fails, counter is not incremented
    const result = await generateSampleJob(req.body.jobTitle, {
      summary: profile.summary,
      experiences: profile.experiences.map((e) => ({ title: e.title, company: e.company })),
      skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
    });

    // Fetch first user status for default job status
    const firstStatus = await prisma.userJobStatus.findFirst({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    // Atomic: create job + increment counter
    let job: any;
    await prisma.$transaction(async (tx) => {
      job = await tx.jobApplication.create({
        data: {
          userId,
          jobTitle: `(EXAMPLE) ${req.body.jobTitle}`,
          company: result.company,
          location: result.location,
          description: result.description,
          fitAnalysis: result.fitAnalysis as any,
          status: firstStatus?.label ?? 'SAVED',
        },
      });
      await tx.profile.update({
        where: { id: profile.id },
        data: { sampleJobsGenerated: { increment: 1 } },
      });
    });

    res.status(201).json({
      job,
      generationsUsed: profile.sampleJobsGenerated + 1,
      generationsLimit: SAMPLE_JOB_LIMIT,
    });
  } catch (err) { next(err); }
});

export default router;

