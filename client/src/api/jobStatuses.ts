import api from './client';
import { JobStatus } from '../types';

export const getJobStatuses = () => api.get<JobStatus[]>('/job-statuses').then((r) => r.data);
export const createJobStatus = (data: { label: string; color: string }) =>
  api.post<JobStatus>('/job-statuses', data).then((r) => r.data);
export const updateJobStatus = (id: string, data: Partial<Pick<JobStatus, 'label' | 'color' | 'order'>>) =>
  api.put<JobStatus>(`/job-statuses/${id}`, data).then((r) => r.data);
export const deleteJobStatus = (id: string) => api.delete(`/job-statuses/${id}`);
export const reorderJobStatuses = (ids: string[]) =>
  api.post<JobStatus[]>('/job-statuses/reorder', { ids }).then((r) => r.data);
