import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { generatePdf } from '../services/pdf';
import { renderTemplate } from '../services/templates';
import { profileToResumeContent } from '../utils/profileToContent';
import { logActivity, ActivityAction } from '../services/activityLog';

const router = Router();
router.use(requireAuth);

const createResumeSchema = z.object({
  title: z.string().min(1),
  templateId: z.enum(['modern','classic','minimal','executive','slate','teal','elegant','creative','tech','gradient','timeline','compact','academic','coral','navy','cleanpro','soft','forest','monochrome','sunrise']),
});

const ALL_TEMPLATE_IDS = ['modern','classic','minimal','executive','slate','teal','elegant','creative','tech','gradient','timeline','compact','academic','coral','navy','cleanpro','soft','forest','monochrome','sunrise'] as const;

const updateResumeSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'FINAL', 'ARCHIVED']).optional(),
  templateId: z.enum(ALL_TEMPLATE_IDS).optional(),
  coverLetter: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: getUser(req).id, tailoredFor: null },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(resumes);
  } catch (err) { next(err); }
});

router.post('/', validateBody(createResumeSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      include: { experiences: { orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }, educations: { orderBy: { order: 'asc' } }, skills: true, certifications: true },
    });
    if (!profile) return res.status(404).json({ error: 'Complete your profile first' });

    const contentJson = profileToResumeContent(profile);

    const resume = await prisma.resume.create({
      data: {
        title: req.body.title,
        templateId: req.body.templateId,
        userId: getUser(req).id,
        contentJson: contentJson as any,
      },
    });
    logActivity(getUser(req).id, ActivityAction.RESUME_CREATED, {
      resumeId: resume.id,
      title: resume.title,
      templateId: resume.templateId,
    }).catch(() => {});
    res.status(201).json(resume);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id, userId: getUser(req).id } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json(resume);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(updateResumeSchema), async (req, res, next) => {
  try {
    const resume = await prisma.resume.updateMany({ where: { id: req.params.id as string, userId: getUser(req).id }, data: req.body });
    if (resume.count === 0) return res.status(404).json({ error: 'Resume not found' });
    const updated = await prisma.resume.findUnique({ where: { id: req.params.id as string } });
    if (req.body.status === 'ARCHIVED' && updated) {
      logActivity(getUser(req).id, ActivityAction.RESUME_ARCHIVED, {
        resumeId: updated.id,
        title: updated.title,
      }).catch(() => {});
    }
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id, userId } });
    if (resume) {
      await logActivity(userId, ActivityAction.RESUME_DELETED, {
        resumeId: resume.id,
        title: resume.title,
        templateId: resume.templateId,
        status: resume.status,
        createdAt: resume.createdAt,
      });
    }
    await prisma.resume.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/render', validateBody(z.object({ contentJson: z.record(z.string(), z.unknown()) })), async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id as string, userId: getUser(req).id } });
    if (!resume) return res.status(404).send('<p>Resume not found</p>');
    const html = renderTemplate(resume.templateId, req.body.contentJson as any);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

router.get('/:id/preview', async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id, userId: getUser(req).id } });
    if (!resume) return res.status(404).send('<p>Resume not found</p>');
    const html = renderTemplate(resume.templateId, resume.contentJson as any);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: req.params.id, userId: getUser(req).id } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    const html = renderTemplate(resume.templateId, resume.contentJson as any);
    const pdf = await generatePdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.title}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

export default router;
