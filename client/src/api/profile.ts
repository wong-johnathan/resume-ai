import api from './client';
import { Profile, Experience, Education, Skill, Certification } from '../types';

export const getProfile = () => api.get<Profile>('/profile').then((r) => r.data);
export const createProfile = (data: Partial<Profile>) => api.post<Profile>('/profile', data).then((r) => r.data);
export const updateProfile = (data: Partial<Profile>) => api.put<Profile>('/profile', data).then((r) => r.data);

export const addExperience = (data: Omit<Experience, 'id'>) => api.post<Experience>('/profile/experiences', data).then((r) => r.data);
export const updateExperience = (id: string, data: Partial<Experience>) => api.put<Experience>(`/profile/experiences/${id}`, data).then((r) => r.data);
export const deleteExperience = (id: string) => api.delete(`/profile/experiences/${id}`);

export const addEducation = (data: Omit<Education, 'id'>) => api.post<Education>('/profile/educations', data).then((r) => r.data);
export const updateEducation = (id: string, data: Partial<Education>) => api.put<Education>(`/profile/educations/${id}`, data).then((r) => r.data);
export const deleteEducation = (id: string) => api.delete(`/profile/educations/${id}`);

export const addSkill = (data: Omit<Skill, 'id'>) => api.post<Skill>('/profile/skills', data).then((r) => r.data);
export const updateSkill = (id: string, data: Partial<Skill>) => api.put<Skill>(`/profile/skills/${id}`, data).then((r) => r.data);
export const deleteSkill = (id: string) => api.delete(`/profile/skills/${id}`);

export const addCertification = (data: Omit<Certification, 'id'>) => api.post<Certification>('/profile/certifications', data).then((r) => r.data);
export const updateCertification = (id: string, data: Partial<Certification>) => api.put<Certification>(`/profile/certifications/${id}`, data).then((r) => r.data);
export const deleteCertification = (id: string) => api.delete(`/profile/certifications/${id}`);

export const parsePdf = async (file: File) => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then((page) => page.getTextContent()).then((content) =>
        content.items.map((item: any) => item.str).join(' ')
      )
    )
  );
  const text = pages.join('\n\n');
  return api.post('/profile/parse-pdf', { text }).then((r) => r.data);
};
