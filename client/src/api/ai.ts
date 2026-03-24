import api from './client';
import { Resume, FitAnalysis, JobApplication } from '../types';

export interface ExtractedJobInfo {
  company: string;
  jobTitle: string;
  location?: string;
  description: string;
}

export const crawlUrl = (url: string) =>
  api.post<ExtractedJobInfo>('/ai/crawl-url', { url }).then((r) => r.data);

export const analyzeFit = (jobDescription: string, resumeId?: string) =>
  api.post<FitAnalysis>('/ai/analyze-fit', { jobDescription, resumeId }).then((r) => r.data);

export const tailorResume = (templateId: string, jobDescription: string, jobId?: string) =>
  api.post<Resume>('/ai/tailor', { templateId, jobDescription, jobId }).then((r) => r.data);

export const improveSummary = (currentSummary: string, targetRole: string) =>
  api.post<{ summary: string }>('/ai/improve-summary', { currentSummary, targetRole }).then((r) => r.data);

export const generateSummary = (
  targetRole: string,
  experiences: Array<{ title: string; company: string; description: string }>,
  skills: Array<{ name: string }>
) =>
  api.post<{ summary: string; generationsUsed: number; generationsLimit: number }>('/ai/generate-summary', { targetRole, experiences, skills }).then((r) => r.data);

// Cover letter uses SSE streaming — returns an EventSource-like fetch stream
export function streamCoverLetter(
  jobDescription: string,
  tone: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  jobId?: string
): () => void {
  const controller = new AbortController();

  fetch('/api/ai/cover-letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ jobDescription, tone, ...(jobId ? { jobId } : {}) }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) { onDone(); return; }
            if (payload.text) onChunk(payload.text);
          } catch { /* ignore malformed lines */ }
        }
      }
    }
    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err);
  });

  return () => controller.abort();
}

export interface SampleJobStatusResponse {
  generationsUsed: number;
  generationsLimit: number;
}

export interface SampleTitlesResponse {
  titles: string[];
  generationsUsed: number;
  generationsLimit: number;
}

export interface SampleJobResponse {
  job: JobApplication;
  generationsUsed: number;
  generationsLimit: number;
}

export const getSampleJobStatus = () =>
  api.get<SampleJobStatusResponse>('/ai/sample-job-status').then((r) => r.data);

export const getSampleTitles = () =>
  api.post<SampleTitlesResponse>('/ai/sample-titles').then((r) => r.data);

export const createSampleJob = (jobTitle: string) =>
  api.post<SampleJobResponse>('/ai/sample-job', { jobTitle }).then((r) => r.data);
