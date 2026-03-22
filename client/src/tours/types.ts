import type { TourId } from '../api/tours';

export type { TourId };

export interface TourStep {
  /** CSS selector for the element to spotlight — uses data-tour attributes */
  selector: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  /**
   * If set, the tour advances automatically when this CSS selector appears in the DOM
   * (used for the prep tour where category-selector renders after a button click)
   */
  autoAdvanceWhenSelector?: string;
}

export interface TourConfig {
  id: TourId;
  steps: TourStep[];
}
