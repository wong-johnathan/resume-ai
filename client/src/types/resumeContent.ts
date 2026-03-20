export interface ResumePersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface ResumeExperience {
  company: string;
  title: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
  order: number;
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  gpa?: string | null;
  order: number;
}

export interface ResumeSkill {
  name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category?: string | null;
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  issueDate?: string | null;
  credentialUrl?: string | null;
}

export interface ResumeContent {
  personalInfo: ResumePersonalInfo;
  summary: string;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  certifications: ResumeCertification[];
}
