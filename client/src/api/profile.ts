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
      pdf.getPage(i + 1).then((page) => page.getTextContent()).then((content) => {
        // Group text items by Y coordinate to reconstruct visual lines.
        // Joining with ' ' loses bullet points — items on the same line share
        // a Y value (within a small tolerance) and items on different lines don't.
        const SAME_LINE_THRESHOLD = 3;
        const lineGroups: Array<{ y: number; items: Array<{ x: number; str: string }> }> = [];

        for (const item of content.items as any[]) {
          if (!('str' in item) || !item.str) continue;
          const y: number = item.transform[5];
          const x: number = item.transform[4];
          const existing = lineGroups.find((g) => Math.abs(g.y - y) <= SAME_LINE_THRESHOLD);
          if (existing) {
            existing.items.push({ x, str: item.str });
          } else {
            lineGroups.push({ y, items: [{ x, str: item.str }] });
          }
        }

        // PDF Y-axis goes bottom-to-top, so sort descending (top of page first)
        lineGroups.sort((a, b) => b.y - a.y);

        return lineGroups
          .map((group) => {
            group.items.sort((a, b) => a.x - b.x);
            return group.items.map((i) => i.str).join('');
          })
          .join('\n');
      })
    )
  );
  const text = pages.join('\n\n');
  return api.post('/profile/parse-pdf', { text }).then((r) => r.data);
};
