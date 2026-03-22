import type { TourConfig } from '../types';

export const jobsListTour: TourConfig = {
  id: 'jobs-list',
  steps: [
    {
      selector: '[data-tour="add-job-btn"]',
      title: 'Track a new job',
      body: 'Click here to add a job application. Paste in the job description to unlock AI resume tailoring, cover letter generation, and fit analysis.',
      placement: 'bottom',
    },
  ],
};
