import api from './api';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageCount: number;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  _count: { resumes: number; jobApplications: number };
}

export interface UserDetail {
  user: { id: string; email: string; displayName: string | null; createdAt: string; lastActiveAt: string | null; profile: { firstName: string; lastName: string; location: string | null } | null };
  resumes: { id: string; title: string; status: string; templateId: string; tailoredFor: string | null; createdAt: string }[];
  jobs: { id: string; company: string; jobTitle: string; status: string; appliedAt: string | null; createdAt: string }[];
  aiAmendmentCount: number;
  aiUsage: { tailor: number; coverLetter: number; interviewPrep: number; summary: number };
  activityLog: ActivityLogEntry[];
}

export interface ResumeSummary {
  id: string;
  title: string;
  status: string;
  templateId: string;
  tailoredFor: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string | null };
}

export interface JobDetail {
  id: string;
  company: string;
  jobTitle: string;
  jobUrl: string | null;
  description: string | null;
  status: string;
  statusUpdatedAt: string | null;
  appliedAt: string | null;
  notes: string | null;
  coverLetter: string | null;
  salary: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  aiAmendments: { type: string; createdAt: string }[];
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; email: string; displayName: string | null };
}

export interface Stats {
  totalUsers: number;
  resumes: { draft: number; final: number; archived: number };
  resumesDeleted: number;
  resumesArchived: number;
  totalJobs: number;
  uniqueVisitors: number;
  aiUsage: { tailor: number; coverLetter: number; interviewPrep: number; summary: number };
}

export const adminApi = {
  getMe: () => api.get<AdminUser>('/admin/auth/me').then((r) => r.data),
  logout: () => api.post('/admin/auth/logout').then((r) => r.data),

  getStats: () => api.get<Stats>('/admin/stats').then((r) => r.data),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<UserSummary>>('/admin/users', { params }).then((r) => r.data),
  getUser: (userId: string) => api.get<UserDetail>(`/admin/users/${userId}`).then((r) => r.data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`).then((r) => r.data),

  getResumes: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<ResumeSummary>>('/admin/resumes', { params }).then((r) => r.data),
  deleteResume: (resumeId: string) => api.delete(`/admin/resumes/${resumeId}`).then((r) => r.data),

  getJob: (userId: string, jobId: string) =>
    api.get<JobDetail>(`/admin/users/${userId}/jobs/${jobId}`).then((r) => r.data),

  getLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string }) =>
    api.get<PaginatedResponse<ActivityLogEntry>>('/admin/logs', { params }).then((r) => r.data),
};
