import type { TourConfig } from '../types';

export const jobPrepTour: TourConfig = {
  id: 'job-prep',
  steps: [
    {
      selector: '[data-tour="prep-panel"]',
      title: 'Interview Prep',
      body: 'This panel generates AI-powered interview questions tailored to this job and your experience. Start here to prepare.',
      placement: 'top',
    },
    {
      selector: '[data-tour="prepare-btn"]',
      title: 'Generate Question Categories',
      body: 'Click "Prepare for Interview" to let Claude analyse the job description and suggest relevant interview question categories.',
      placement: 'bottom',
      autoAdvanceWhenSelector: '[data-tour="category-selector"]',
    },
    {
      selector: '[data-tour="category-selector"]',
      title: 'Choose Your Focus Areas',
      body: 'Select which categories to prepare for and how many questions per category, then generate your personalised question set.',
      placement: 'top',
    },
  ],
};
