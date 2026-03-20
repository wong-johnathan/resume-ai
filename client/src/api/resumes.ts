import api from './client';
import { Resume } from '../types';

export const getResumes = () => api.get<Resume[]>('/resumes').then((r) => r.data);
export const getResume = (id: string) => api.get<Resume>(`/resumes/${id}`).then((r) => r.data);
export const createResume = (data: { title: string; templateId: string }) => api.post<Resume>('/resumes', data).then((r) => r.data);
export const updateResume = (id: string, data: Partial<Resume>) => api.put<Resume>(`/resumes/${id}`, data).then((r) => r.data);
export const deleteResume = (id: string) => api.delete(`/resumes/${id}`);
export const getPdfUrl = (id: string) => `/api/resumes/${id}/pdf`;
export const getPreviewUrl = (id: string) => `/api/resumes/${id}/preview`;
