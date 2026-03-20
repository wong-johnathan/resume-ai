import api from './client';
import { JobApplication, ApplicationStatus } from '../types';

export const getJobs = (status?: ApplicationStatus) =>
  api.get<JobApplication[]>('/jobs', { params: status ? { status } : {} }).then((r) => r.data);
export const getJob = (id: string) => api.get<JobApplication>(`/jobs/${id}`).then((r) => r.data);
export const createJob = (data: Partial<JobApplication>) => api.post<JobApplication>('/jobs', data).then((r) => r.data);
export const updateJob = (id: string, data: Partial<JobApplication>) => api.put<JobApplication>(`/jobs/${id}`, data).then((r) => r.data);
export const deleteJob = (id: string) => api.delete(`/jobs/${id}`);
export const linkResume = (jobId: string, resumeId: string | null) => api.put(`/jobs/${jobId}/resume`, { resumeId });
