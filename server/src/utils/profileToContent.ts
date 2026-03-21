import { Prisma } from '@prisma/client';
import { ResumeContent } from '../services/claude';

type ProfileWithRelations = Prisma.ProfileGetPayload<{
  include: {
    experiences: true;
    educations: true;
    skills: true;
    certifications: true;
  };
}>;

export function profileToResumeContent(profile: ProfileWithRelations): ResumeContent {
  return {
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
