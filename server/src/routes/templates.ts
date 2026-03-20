import { Router } from 'express';
import { renderTemplate, TEMPLATE_LIST } from '../services/templates';
import { ResumeContent } from '../services/claude';
import { prisma } from '../config/prisma';

const router = Router();

const SAMPLE: ResumeContent = {
  personalInfo: {
    firstName: 'Alexandra',
    lastName: 'Chen',
    email: 'alex.chen@email.com',
    phone: '(415) 555-0182',
    location: 'San Francisco, CA',
    linkedinUrl: 'linkedin.com/in/alexchen',
    githubUrl: 'github.com/alexchen',
    portfolioUrl: 'alexchen.dev',
  },
  summary:
    'Senior software engineer with 8+ years of experience building scalable web applications and distributed systems. Passionate about developer experience, clean architecture, and delivering products that make a real difference.',
  experiences: [
    {
      company: 'Stripe',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2020-03-01',
      endDate: null,
      isCurrent: true,
      description:
        'Led development of the payments reconciliation platform serving 10M+ transactions daily. Reduced system latency by 40% through architectural improvements. Mentored 4 junior engineers and drove TypeScript adoption across the team.',
      order: 0,
    },
    {
      company: 'Airbnb',
      title: 'Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2017-06-01',
      endDate: '2020-02-28',
      isCurrent: false,
      description:
        'Built and maintained booking infrastructure for 2M+ daily active users. Improved checkout conversion by 12% through A/B testing and UX optimization. Designed the reservation state machine that became the foundation for multiple new product lines.',
      order: 1,
    },
    {
      company: 'Lyft',
      title: 'Junior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2015-08-01',
      endDate: '2017-05-31',
      isCurrent: false,
      description:
        'Developed driver-facing mobile features used by 500K+ drivers. Built internal tooling that reduced on-call incident resolution time by 30%. Contributed to the migration from monolith to microservices architecture.',
      order: 2,
    },
  ],
  educations: [
    {
      institution: 'UC Berkeley',
      degree: 'B.S. Computer Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2011-09-01',
      endDate: '2015-05-31',
      gpa: '3.8',
      order: 0,
    },
  ],
  skills: [
    { name: 'TypeScript', level: 'EXPERT', category: 'Languages' },
    { name: 'React', level: 'EXPERT', category: 'Frontend' },
    { name: 'Node.js', level: 'ADVANCED', category: 'Backend' },
    { name: 'PostgreSQL', level: 'ADVANCED', category: 'Databases' },
    { name: 'Go', level: 'INTERMEDIATE', category: 'Languages' },
    { name: 'AWS', level: 'INTERMEDIATE', category: 'Cloud' },
    { name: 'Docker', level: 'INTERMEDIATE', category: 'DevOps' },
    { name: 'Kubernetes', level: 'BEGINNER', category: 'DevOps' },
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      issueDate: '2022-04-01',
    },
  ],
};

const VALID_IDS = new Set(TEMPLATE_LIST.map((t) => t.id));

router.get('/:id/preview', async (req, res) => {
  if (!VALID_IDS.has(req.params.id)) return res.status(404).send('<p>Template not found</p>');

  let content: ResumeContent = SAMPLE;

  if (req.isAuthenticated()) {
    const userId = (req.user as any).id as string;
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' } }, educations: { orderBy: { order: 'asc' } }, skills: true, certifications: true },
    });

    const isComplete = profile && profile.firstName && profile.lastName && profile.email &&
      (profile.experiences.length > 0 || profile.educations.length > 0 || profile.skills.length > 0);

    if (isComplete) {
      content = {
        personalInfo: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone ?? undefined,
          location: profile.location ?? undefined,
          linkedinUrl: profile.linkedinUrl ?? undefined,
          githubUrl: profile.githubUrl ?? undefined,
          portfolioUrl: profile.portfolioUrl ?? undefined,
        },
        summary: profile.summary ?? '',
        experiences: profile.experiences.map((e) => ({
          company: e.company,
          title: e.title,
          location: e.location ?? undefined,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate ? e.endDate.toISOString() : null,
          isCurrent: e.isCurrent,
          description: e.description,
          order: e.order,
        })),
        educations: profile.educations.map((e) => ({
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy ?? undefined,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate ? e.endDate.toISOString() : null,
          gpa: e.gpa ?? undefined,
          order: e.order,
        })),
        skills: profile.skills.map((s) => ({
          name: s.name,
          level: s.level as any,
          category: s.category ?? undefined,
        })),
        certifications: profile.certifications.map((c) => ({
          name: c.name,
          issuer: c.issuer,
          issueDate: c.issueDate ? c.issueDate.toISOString() : undefined,
          expiryDate: c.expiryDate ? c.expiryDate.toISOString() : undefined,
          credentialUrl: c.credentialUrl ?? undefined,
        })),
      };
    }
  }

  const html = renderTemplate(req.params.id, content);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
