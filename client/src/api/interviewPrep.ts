import api from './client';
import { InterviewPrep, InterviewFeedback } from '../types';

export const getInterviewPrep = (jobId: string) =>
  api.get<InterviewPrep | null>(`/interview-prep/${jobId}`).then((r) => r.data);

export const deleteInterviewPrep = (jobId: string) =>
  api.delete(`/interview-prep/${jobId}`).then((r) => r.data);

export const generateCategories = (jobId: string) =>
  api.post<{ categories: string[] }>('/ai/interview-categories', { jobId }).then((r) => r.data);

export const generateQuestions = (
  jobId: string,
  selections: Array<{ name: string; questionCount: number }>
) =>
  api.post<InterviewPrep>('/ai/interview-questions', { jobId, selections }).then((r) => r.data);

export const submitAnswer = (payload: {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: string;
  answer: string;
}) =>
  api
    .post<{ feedback: InterviewFeedback; prep: InterviewPrep }>('/ai/interview-feedback', payload)
    .then((r) => r.data);

export const clearAnswer = (
  jobId: string,
  categoryName: string,
  questionIndex: number
) =>
  api
    .patch<InterviewPrep>(`/interview-prep/${jobId}/clear-answer`, { categoryName, questionIndex })
    .then((r) => r.data);

export const addQuestion = (jobId: string, categoryName: string, question: string) =>
  api
    .patch<InterviewPrep>(`/interview-prep/${jobId}/add-question`, { categoryName, question })
    .then((r) => r.data);

export const generateSampleResponse = (payload: {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: string;
}) =>
  api
    .post<{ sampleResponse: string; prep: InterviewPrep }>('/ai/interview-sample-response', payload)
    .then((r) => r.data);
