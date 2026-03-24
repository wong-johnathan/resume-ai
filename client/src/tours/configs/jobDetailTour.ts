import type { TourConfig } from '../types';

export const jobDetailTour: TourConfig = {
  id: 'job-detail',
  steps: [
    {
      selector: '[data-tour="status-select"]',
      title: 'Track your application status',
      body: 'Update your application stage here — from Applied to Offer. Each change is recorded in the Status History tab so you always have a full timeline.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="tab-bar"]',
      title: 'Job details in 4 tabs',
      body: 'Your job is organized across four tabs: Job Info & Fit, Resume & Cover Letter, Interview Prep, and Notes & Timeline.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="tab-info"]',
      title: 'Job Info & Fit',
      body: 'View the job description and AI fit analysis — see your match score, strengths, and gaps at a glance.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="tab-resume"]',
      title: 'Resume & Cover Letter',
      body: 'Tailor your resume for this job with AI and generate a cover letter. Each job supports up to 3 AI amendments.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="tab-prep"]',
      title: 'Interview Prep',
      body: 'Generate AI-powered interview questions specific to this role and your background. Practice answers and get feedback.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour="tab-notes"]',
      title: 'Notes & Timeline',
      body: 'Keep personal notes and see a full history of every status change — great for tracking follow-ups and key dates.',
      placement: 'bottom',
    },
  ],
};
