import type { TourConfig } from '../types';

export const jobDetailTour: TourConfig = {
  id: 'job-detail',
  steps: [
    {
      selector: '[data-tour="job-description"]',
      title: 'Job Description',
      body: 'This is a reference view of the job description. The AI uses it for tailoring, quizzes, and fit analysis. To make changes, click “Edit” button located on the top right.',
      placement: 'top',
    },
    {
      selector: '[data-tour="fit-analysis"]',
      title: 'Fit Analysis',
      body: 'After adding a job description, Claude scores how well your profile matches the role and highlights strengths and gaps.',
      placement: 'top',
    },
    {
      selector: '[data-tour="interview-prep-link"]',
      title: 'Interview Prep',
      body: 'Click here to generate tailored interview questions based on this job and your profile.',
      placement: 'top',
    },
    {
      selector: '[data-tour="job-notes"]',
      title: 'Notes',
      body: 'Keep track of interview notes, contacts, and follow-up reminders here.',
      placement: 'top',
    },
    {
      selector: '[data-tour="job-status"]',
      title: 'Application Status',
      body: 'Update your application status as you progress through the hiring process.',
      placement: 'left',
    },
    {
      selector: '[data-tour="job-resume"]',
      title: 'Resume & AI Tailoring',
      body: 'Select a template and let Claude tailor your resume specifically for this job. You get 3 AI amendments per job.',
      placement: 'left',
    },
    {
      selector: '[data-tour="job-cover-letter"]',
      title: 'Cover Letter',
      body: 'Generate a personalised cover letter with Claude. Choose your tone — Professional, Conversational, or Enthusiastic.',
      placement: 'left',
    },
  ],
};
