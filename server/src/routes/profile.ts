import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { parsePdfResume } from '../services/claude';
import { logActivity, ActivityAction } from '../services/activityLog';

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  summary: z.string().nullable().optional(),
});

const experienceSchema = z.object({
  company: z.string().nullish().transform((v) => v ?? ''),
  title: z.string().nullish().transform((v) => v ?? ''),
  location: z.string().nullish().transform((v) => v ?? undefined),
  startDate: z.string(),
  endDate: z.string().nullish().transform((v) => v ?? undefined),
  isCurrent: z.boolean().default(false),
  description: z.string().nullish().transform((v) => v ?? ''),
  order: z.number().default(0),
});

const educationSchema = z.object({
  institution: z.string().nullish().transform((v) => v ?? ''),
  degree: z.string().nullish().transform((v) => v ?? ''),
  fieldOfStudy: z.string().nullish().transform((v) => v ?? undefined),
  startDate: z.string(),
  endDate: z.string().nullish().transform((v) => v ?? undefined),
  gpa: z.union([z.string(), z.number()]).nullish().transform((v) => v == null ? undefined : String(v)),
  order: z.number().default(0),
});

const skillSchema = z.object({
  name: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  category: z.string().nullish().transform((v) => v ?? undefined),
});

const certSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().nullish().transform((v) => v ?? ''),
  issueDate: z.string().nullish().transform((v) => v ?? undefined),
  expiryDate: z.string().nullish().transform((v) => v ?? undefined),
  credentialUrl: z.string().url().or(z.literal('')).nullish().transform((v) => v ?? undefined),
});

// ─── Parse PDF ───────────────────────────────────────────────────────────────

router.post('/parse-pdf', validateBody(z.object({ text: z.string().min(1) })), async (req, res, next) => {
  try {
    const parsed = await parsePdfResume(req.body.text);
    res.json(parsed);
  } catch (err) { next(err); }
});

// ─── Profile CRUD ────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      include: { experiences: { orderBy: { order: 'asc' } }, educations: { orderBy: { order: 'asc' } }, skills: true, certifications: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) { next(err); }
});

router.post('/', validateBody(profileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.create({ data: { ...req.body, userId: getUser(req).id } });
    res.status(201).json(profile);
  } catch (err) { next(err); }
});

router.put('/', validateBody(profileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.update({ where: { userId: getUser(req).id }, data: req.body });
    logActivity(getUser(req).id, ActivityAction.PROFILE_UPDATED).catch(() => {});
    res.json(profile);
  } catch (err) { next(err); }
});

// ─── Experiences ─────────────────────────────────────────────────────────────

router.post('/experiences', validateBody(experienceSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: getUser(req).id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const exp = await prisma.experience.create({ data: { ...req.body, startDate: new Date(req.body.startDate), endDate: req.body.endDate ? new Date(req.body.endDate) : null, profileId: profile.id } });
    res.status(201).json(exp);
  } catch (err) { next(err); }
});

router.put('/experiences/:id', validateBody(experienceSchema), async (req, res, next) => {
  try {
    const exp = await prisma.experience.update({ where: { id: req.params.id as string }, data: { ...req.body, startDate: new Date(req.body.startDate), endDate: req.body.endDate ? new Date(req.body.endDate) : null } });
    res.json(exp);
  } catch (err) { next(err); }
});

router.delete('/experiences/:id', async (req, res, next) => {
  try {
    await prisma.experience.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Educations ──────────────────────────────────────────────────────────────

router.post('/educations', validateBody(educationSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: getUser(req).id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const edu = await prisma.education.create({ data: { ...req.body, startDate: new Date(req.body.startDate), endDate: req.body.endDate ? new Date(req.body.endDate) : null, profileId: profile.id } });
    res.status(201).json(edu);
  } catch (err) { next(err); }
});

router.put('/educations/:id', validateBody(educationSchema), async (req, res, next) => {
  try {
    const edu = await prisma.education.update({ where: { id: req.params.id as string }, data: { ...req.body, startDate: new Date(req.body.startDate), endDate: req.body.endDate ? new Date(req.body.endDate) : null } });
    res.json(edu);
  } catch (err) { next(err); }
});

router.delete('/educations/:id', async (req, res, next) => {
  try {
    await prisma.education.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Skills ──────────────────────────────────────────────────────────────────

router.post('/skills', validateBody(skillSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: getUser(req).id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const skill = await prisma.skill.create({ data: { ...req.body, profileId: profile.id } });
    res.status(201).json(skill);
  } catch (err) { next(err); }
});

router.put('/skills/:id', validateBody(skillSchema), async (req, res, next) => {
  try {
    const skill = await prisma.skill.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(skill);
  } catch (err) { next(err); }
});

router.delete('/skills/:id', async (req, res, next) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Certifications ──────────────────────────────────────────────────────────

router.post('/certifications', validateBody(certSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: getUser(req).id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const cert = await prisma.certification.create({ data: { ...req.body, issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null, expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null, profileId: profile.id } });
    res.status(201).json(cert);
  } catch (err) { next(err); }
});

router.put('/certifications/:id', validateBody(certSchema), async (req, res, next) => {
  try {
    const cert = await prisma.certification.update({ where: { id: req.params.id as string }, data: { ...req.body, issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null, expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null } });
    res.json(cert);
  } catch (err) { next(err); }
});

router.delete('/certifications/:id', async (req, res, next) => {
  try {
    await prisma.certification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
