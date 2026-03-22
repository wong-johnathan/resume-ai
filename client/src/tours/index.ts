export { jobsListTour } from './configs/jobsListTour';
export { jobDetailTour } from './configs/jobDetailTour';
export { jobPrepTour } from './configs/jobPrepTour';
export type { TourId, TourStep, TourConfig } from './types';

import type { TourId, TourConfig } from './types';
import { jobsListTour } from './configs/jobsListTour';
import { jobDetailTour } from './configs/jobDetailTour';
import { jobPrepTour } from './configs/jobPrepTour';

export const TOUR_CONFIGS: Record<TourId, TourConfig> = {
  'jobs-list': jobsListTour,
  'job-detail': jobDetailTour,
  'job-prep': jobPrepTour,
};
