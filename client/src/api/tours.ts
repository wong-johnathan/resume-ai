import api from './client';

export type TourId = 'jobs-list' | 'job-detail' | 'job-prep';

export const getTours = (): Promise<Record<TourId, string>> =>
  api.get<{ toursCompleted: Record<TourId, string> }>('/tours').then((r) => r.data.toursCompleted);

export const completeTour = (tourId: TourId): Promise<Record<TourId, string>> =>
  api.post<{ toursCompleted: Record<TourId, string> }>(`/tours/${tourId}/complete`).then((r) => r.data.toursCompleted);

export const resetTour = (tourId: TourId): Promise<Record<TourId, string>> =>
  api.delete<{ toursCompleted: Record<TourId, string> }>(`/tours/${tourId}/complete`).then((r) => r.data.toursCompleted);
