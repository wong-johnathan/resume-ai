export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  provider: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
  order: number;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  gpa?: string | null;
  order: number;
}

export interface Skill {
  id: string;
  name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialUrl?: string | null;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  summary?: string | null;
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
}

import type { ResumeContent } from './resumeContent';
export type { ResumeContent };

export interface Resume {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED';
  contentJson: ResumeContent;
  tailoredFor?: string | null;
  coverLetter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = string;

export interface JobStatus {
  id: string;
  userId: string;
  label: string;
  color: string;
  order: number;
}

export interface AiAmendment {
  id: string;
  jobApplicationId: string;
  type: 'RESUME_TAILOR' | 'COVER_LETTER';
  resumeId?: string | null;
  coverLetterText?: string | null;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  jobUrl?: string | null;
  description?: string | null;
  status: ApplicationStatus;
  appliedAt?: string | null;
  resumeId?: string | null;
  resume?: Pick<Resume, 'id' | 'title' | 'templateId' | 'tailoredFor'> | null;
  notes?: string | null;
  coverLetter?: string | null;
  salary?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  aiAmendments?: AiAmendment[];
}
