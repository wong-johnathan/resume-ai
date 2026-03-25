# Interview Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to generate AI-driven interview prep questions for any saved job, organized by relevant categories they select (e.g., Behavioral, JavaScript, System Design), practice answering them, and receive persistent AI feedback with strengths, areas to improve, and a tailored sample response.

**Architecture:** A new `InterviewPrep` Prisma model (one-per-job, `@unique` on `jobId`) stores category + question data as a JSON array where each question is an object holding the question text, optional user answer, and optional AI feedback; three new AI endpoints handle category suggestion, question generation, and answer evaluation; a new CRUD route handles fetch/delete/patch; the client-side panel orchestrates three visual states (empty → category-selection → questions-view) using local React state plus React Query for server data, and each question card expands to an answer practice panel.

**Tech Stack:** Node.js/Express + TypeScript, Prisma 5 + PostgreSQL, OpenAI SDK (Claude via gpt-4o), React 18 + TypeScript, React Query, Axios, Tailwind CSS, Lucide icons, Zod

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `server/prisma/schema.prisma` | Add `InterviewPrep` model + back-relations |
| Modify | `server/src/services/claude.ts` | Add `generateInterviewCategories`, `generateInterviewQuestions`, `evaluateInterviewAnswer` |
| Modify | `server/src/routes/ai.ts` | Add three new AI endpoints (categories, questions, feedback) |
| Create | `server/src/routes/interviewPrep.ts` | CRUD: GET + DELETE + PATCH interview prep |
| Modify | `server/src/app.ts` | Register new interview prep router |
| Modify | `client/src/types/index.ts` | Add `InterviewQuestion`, `InterviewCategory`, `InterviewPrep` interfaces |
| Create | `client/src/api/interviewPrep.ts` | API wrapper functions |
| Create | `client/src/components/jobs/InterviewCategorySelector.tsx` | Category checklist + count selector UI |
| Create | `client/src/components/jobs/InterviewAnswerPanel.tsx` | Answer textarea + feedback display per question |
| Create | `client/src/components/jobs/InterviewQuestionsView.tsx` | Expandable questions per category with answer panels |
| Create | `client/src/components/jobs/InterviewPrepPanel.tsx` | Orchestrates 3-state flow |
| Modify | `client/src/pages/JobDetailPage.tsx` | Mount `InterviewPrepPanel` in main column |

---

## Task 1 — Database Schema + Migration

**Files:** `server/prisma/schema.prisma`

- [ ] Add the `InterviewPrep` model:
  ```prisma
  model InterviewPrep {
    id         String         @id @default(cuid())
    jobId      String         @unique
    job        JobApplication @relation(fields: [jobId], references: [id], onDelete: Cascade)
    userId     String
    user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
    categories Json
    createdAt  DateTime       @default(now())
    updatedAt  DateTime       @updatedAt
  }
  ```
- [ ] Add back-relation on `JobApplication` model:
  ```prisma
  interviewPrep InterviewPrep?
  ```
- [ ] Add back-relation on `User` model:
  ```prisma
  interviewPreps InterviewPrep[]
  ```
- [ ] Run migration from repo root:
  ```bash
  npm run db:migrate
  ```
  Expected: migration created and applied, Prisma client regenerated.
- [ ] Commit:
  ```bash
  git add server/prisma/
  git commit -m "feat: add InterviewPrep model to schema"
  ```

---

## Task 2 — AI Service Functions

**Files:** `server/src/services/claude.ts`

Follow the existing patterns exactly: `openai.chat.completions.create` with `model: 'gpt-4o'`, `response_format: { type: 'json_object' }`, typed interfaces.

- [ ] Add the `InterviewQuestion` and `InterviewCategory` interface exports near the top of the file:
  ```typescript
  export interface InterviewFeedback {
    strengths: string[];
    improvements: string[];
    sampleResponse: string;
  }

  export interface InterviewQuestion {
    question: string;
    userAnswer?: string;
    feedback?: InterviewFeedback;
  }

  export interface InterviewCategory {
    name: string;
    questionCount: number;
    questions: InterviewQuestion[];
  }
  ```

- [ ] Add `generateInterviewCategories` function:
  ```typescript
  export async function generateInterviewCategories(
    jobDescription: string,
    profile: {
      summary?: string | null;
      experiences: Array<{ title: string; company: string }>;
      skills: Array<{ name: string }>;
    }
  ): Promise<string[]> {
    const skillNames = profile.skills.map((s) => s.name).join(', ');
    const recentRoles = profile.experiences
      .slice(0, 3)
      .map((e) => `${e.title} at ${e.company}`)
      .join('; ');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content:
            'You are an interview coach. Given a job description and candidate background, return a JSON object with a "categories" array of 4–8 interview category names relevant to the role. Examples: "Behavioral", "System Design", "JavaScript", "Java", "Leadership", "Technical Problem Solving", "SQL", "React". Only include categories that are genuinely relevant.',
        },
        {
          role: 'user',
          content: `Job Description:\n${jobDescription}\n\nCandidate Skills: ${skillNames}\nRecent Roles: ${recentRoles}\nSummary: ${profile.summary ?? 'N/A'}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
    return Array.isArray(parsed.categories) ? parsed.categories : [];
  }
  ```

- [ ] Add `generateInterviewQuestions` function. The AI returns questions as plain strings; map each one into an `InterviewQuestion` object so the JSON shape supports answers + feedback from the start:
  ```typescript
  export async function generateInterviewQuestions(
    jobDescription: string,
    profile: {
      summary?: string | null;
      experiences: Array<{ title: string; company: string; description: string }>;
      skills: Array<{ name: string }>;
    },
    selections: Array<{ name: string; questionCount: number }>
  ): Promise<Array<{ name: string; questions: InterviewQuestion[] }>> {
    const skillNames = profile.skills.map((s) => s.name).join(', ');
    const recentRoles = profile.experiences
      .slice(0, 3)
      .map((e) => `${e.title} at ${e.company}: ${e.description?.slice(0, 200) ?? ''}`)
      .join('\n');

    const categoryInstructions = selections
      .map((s) => `- "${s.name}": exactly ${s.questionCount} questions`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert interview coach. Generate tailored interview questions for a candidate based on their background and a specific job description. Return a JSON object with a "categories" array, each item having "name" (string) and "questions" (string array of question text only). Questions should be specific, actionable, and relevant to both the role and the candidate\'s experience.',
        },
        {
          role: 'user',
          content: `Job Description:\n${jobDescription}\n\nCandidate Skills: ${skillNames}\nRecent Experience:\n${recentRoles}\nSummary: ${profile.summary ?? 'N/A'}\n\nGenerate questions for these categories:\n${categoryInstructions}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
    const raw: Array<{ name: string; questions: string[] }> = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];
    // Wrap each question string into InterviewQuestion shape
    return raw.map((cat) => ({
      name: cat.name,
      questions: cat.questions.map((q) => ({ question: q })),
    }));
  }
  ```

- [ ] Add `evaluateInterviewAnswer` function right after `generateInterviewQuestions`:
  ```typescript
  export async function evaluateInterviewAnswer(
    question: string,
    userAnswer: string,
    jobDescription: string,
    categoryName: string
  ): Promise<InterviewFeedback> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior interview coach evaluating a candidate\'s answer. Return a JSON object with: "strengths" (string array of 2-3 things done well), "improvements" (string array of 2-3 specific areas to improve or expand), and "sampleResponse" (a single string with a stronger, more tailored version of the answer — 3-5 sentences). Be honest but encouraging.',
        },
        {
          role: 'user',
          content: `Job Description:\n${jobDescription}\n\nCategory: ${categoryName}\nQuestion: ${question}\n\nCandidate Answer:\n${userAnswer}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      sampleResponse: parsed.sampleResponse ?? '',
    };
  }
  ```

- [ ] Update the commit message to include all three functions:
  ```bash
  git add server/src/services/claude.ts
  git commit -m "feat: add generateInterviewCategories, generateInterviewQuestions, and evaluateInterviewAnswer AI functions"
  ```

---

## Task 3 — Server Routes

**Files:** `server/src/routes/interviewPrep.ts` (create), `server/src/routes/ai.ts` (modify), `server/src/app.ts` (modify)

### 3a — New CRUD route file

- [ ] Create `server/src/routes/interviewPrep.ts`:
  ```typescript
  import { Router } from 'express';
  import { requireAuth, getUser } from '../middleware/auth';
  import prisma from '../lib/prisma'; // adjust import path to match the rest of the codebase

  const router = Router();
  router.use(requireAuth);

  // GET /api/interview-prep/:jobId
  router.get('/:jobId', async (req, res, next) => {
    try {
      const user = getUser(req);
      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId: req.params.jobId, userId: user.id },
      });
      res.json(prep ?? null);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/interview-prep/:jobId
  router.delete('/:jobId', async (req, res, next) => {
    try {
      const user = getUser(req);
      await prisma.interviewPrep.deleteMany({
        where: { jobId: req.params.jobId, userId: user.id },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  export default router;
  ```
  > Note: Check how other route files import prisma (e.g., look at `server/src/routes/jobs.ts`) and match the import style exactly.

### 3b — Add AI endpoints to `server/src/routes/ai.ts`

- [ ] Add imports for the three new service functions at the top of `ai.ts`:
  ```typescript
  import {
    // ...existing imports...
    generateInterviewCategories,
    generateInterviewQuestions,
    evaluateInterviewAnswer,
    InterviewCategory,
    InterviewFeedback,
  } from '../services/claude';
  ```

- [ ] Add `POST /interview-categories` handler (place it near the other AI endpoints):
  ```typescript
  router.post(
    '/interview-categories',
    validateBody(z.object({ jobId: z.string() })),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        const { jobId } = req.body;

        const job = await prisma.jobApplication.findFirst({
          where: { id: jobId, userId: user.id },
        });
        if (!job || !job.description) {
          return res.status(404).json({ error: 'Job not found or has no description' });
        }

        const profile = await prisma.profile.findFirst({
          where: { userId: user.id },
          include: {
            experiences: { orderBy: { order: 'asc' }, take: 3 },
            skills: { take: 10 },
          },
        });

        const categories = await generateInterviewCategories(job.description, {
          summary: profile?.summary,
          experiences: profile?.experiences ?? [],
          skills: profile?.skills ?? [],
        });

        res.json({ categories });
      } catch (err) {
        next(err);
      }
    }
  );
  ```

- [ ] Add `POST /interview-questions` handler:
  ```typescript
  router.post(
    '/interview-questions',
    validateBody(
      z.object({
        jobId: z.string(),
        selections: z
          .array(z.object({ name: z.string(), questionCount: z.number().min(3).max(10) }))
          .min(1),
      })
    ),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        const { jobId, selections } = req.body;

        const job = await prisma.jobApplication.findFirst({
          where: { id: jobId, userId: user.id },
        });
        if (!job || !job.description) {
          return res.status(404).json({ error: 'Job not found or has no description' });
        }

        const profile = await prisma.profile.findFirst({
          where: { userId: user.id },
          include: {
            experiences: { orderBy: { order: 'asc' }, take: 3 },
            skills: { take: 10 },
          },
        });

        const generatedCategories = await generateInterviewQuestions(
          job.description,
          {
            summary: profile?.summary,
            experiences: profile?.experiences ?? [],
            skills: profile?.skills ?? [],
          },
          selections
        );

        // Merge questionCount from selections into the returned categories
        const categories: InterviewCategory[] = generatedCategories.map((cat) => {
          const sel = selections.find((s: { name: string; questionCount: number }) => s.name === cat.name);
          return { name: cat.name, questionCount: sel?.questionCount ?? cat.questions.length, questions: cat.questions };
        });

        const prep = await prisma.interviewPrep.upsert({
          where: { jobId },
          create: { jobId, userId: user.id, categories },
          update: { categories },
        });

        res.json(prep);
      } catch (err) {
        next(err);
      }
    }
  );
  ```

- [ ] Add `POST /interview-feedback` handler after the `/interview-questions` handler:
  ```typescript
  router.post(
    '/interview-feedback',
    validateBody(
      z.object({
        jobId: z.string(),
        categoryName: z.string(),
        questionIndex: z.number().int().min(0),
        answer: z.string().min(1),
      })
    ),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        const { jobId, categoryName, questionIndex, answer } = req.body;

        const job = await prisma.jobApplication.findFirst({
          where: { id: jobId, userId: user.id },
        });
        if (!job || !job.description) {
          return res.status(404).json({ error: 'Job not found or has no description' });
        }

        // Evaluate the answer with AI
        const feedback: InterviewFeedback = await evaluateInterviewAnswer(
          req.body.question, // question text also sent from client
          answer,
          job.description,
          categoryName
        );

        // Load the existing prep and patch the specific question in-place
        const prep = await prisma.interviewPrep.findFirst({
          where: { jobId, userId: user.id },
        });
        if (!prep) {
          return res.status(404).json({ error: 'Interview prep not found' });
        }

        const categories = prep.categories as InterviewCategory[];
        const category = categories.find((c) => c.name === categoryName);
        if (!category || !category.questions[questionIndex]) {
          return res.status(404).json({ error: 'Question not found' });
        }

        category.questions[questionIndex].userAnswer = answer;
        category.questions[questionIndex].feedback = feedback;

        const updated = await prisma.interviewPrep.update({
          where: { jobId },
          data: { categories },
        });

        res.json({ feedback, prep: updated });
      } catch (err) {
        next(err);
      }
    }
  );
  ```
  > Note: The client must send `question` (question text) alongside `answer` so the AI has full context. Add `question: z.string()` to the Zod schema above.

### 3b-patch — Add PATCH to the CRUD route

- [ ] Add a PATCH handler to `server/src/routes/interviewPrep.ts` for clearing a specific question's answer + feedback (allows "Try Again"):
  ```typescript
  // PATCH /api/interview-prep/:jobId/clear-answer
  router.patch('/:jobId/clear-answer', async (req, res, next) => {
    try {
      const user = getUser(req);
      const { categoryName, questionIndex } = req.body;

      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId: req.params.jobId, userId: user.id },
      });
      if (!prep) return res.status(404).json({ error: 'Not found' });

      const categories = prep.categories as any[];
      const category = categories.find((c: any) => c.name === categoryName);
      if (category && category.questions[questionIndex]) {
        delete category.questions[questionIndex].userAnswer;
        delete category.questions[questionIndex].feedback;
      }

      const updated = await prisma.interviewPrep.update({
        where: { jobId: req.params.jobId },
        data: { categories },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
  ```

### 3c — Register in app.ts

- [ ] In `server/src/app.ts`, import and register the new router:
  ```typescript
  import interviewPrepRouter from './routes/interviewPrep';
  // ...
  app.use('/api/interview-prep', interviewPrepRouter);
  ```
  Place this line alongside the other route registrations, before `app.use(errorHandler)`.

- [ ] Commit:
  ```bash
  git add server/src/routes/interviewPrep.ts server/src/routes/ai.ts server/src/app.ts
  git commit -m "feat: add interview prep server routes, AI endpoints, and answer feedback flow"
  ```

---

## Task 4 — Client Types + API Wrapper

**Files:** `client/src/types/index.ts` (modify), `client/src/api/interviewPrep.ts` (create)

### 4a — Types

- [ ] Add to `client/src/types/index.ts`:
  ```typescript
  export interface InterviewFeedback {
    strengths: string[];
    improvements: string[];
    sampleResponse: string;
  }

  export interface InterviewQuestion {
    question: string;
    userAnswer?: string;
    feedback?: InterviewFeedback;
  }

  export interface InterviewCategory {
    name: string;
    questionCount: number;
    questions: InterviewQuestion[];
  }

  export interface InterviewPrep {
    id: string;
    jobId: string;
    userId: string;
    categories: InterviewCategory[];
    createdAt: string;
    updatedAt: string;
  }
  ```

### 4b — API wrapper

- [ ] Create `client/src/api/interviewPrep.ts`:
  ```typescript
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
  ```

- [ ] Commit:
  ```bash
  git add client/src/types/index.ts client/src/api/interviewPrep.ts
  git commit -m "feat: add InterviewPrep types and API wrapper"
  ```

---

## Task 5 — InterviewCategorySelector Component

**Files:** `client/src/components/jobs/InterviewCategorySelector.tsx` (create)

> Note: The `client/src/components/jobs/` directory may not exist yet. Your editor/CLI will create it when you create the first file inside it.

- [ ] Create `client/src/components/jobs/InterviewCategorySelector.tsx`:
  ```typescript
  import { useState } from 'react';

  interface CategorySelection {
    checked: boolean;
    count: number;
  }

  interface Props {
    categories: string[];
    onGenerate: (selections: Array<{ name: string; questionCount: number }>) => void;
    generating: boolean;
  }

  export function InterviewCategorySelector({ categories, onGenerate, generating }: Props) {
    const [selections, setSelections] = useState<Record<string, CategorySelection>>(() =>
      Object.fromEntries(categories.map((cat) => [cat, { checked: true, count: 5 }]))
    );

    const toggleCategory = (name: string) => {
      setSelections((prev) => ({
        ...prev,
        [name]: { ...prev[name], checked: !prev[name].checked },
      }));
    };

    const setCount = (name: string, count: number) => {
      setSelections((prev) => ({
        ...prev,
        [name]: { ...prev[name], count },
      }));
    };

    const anySelected = Object.values(selections).some((s) => s.checked);

    const handleGenerate = () => {
      const selected = Object.entries(selections)
        .filter(([, s]) => s.checked)
        .map(([name, s]) => ({ name, questionCount: s.count }));
      onGenerate(selected);
    };

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Select the categories you want to prep for and how many questions per category.
        </p>
        <div className="space-y-2">
          {categories.map((cat) => {
            const sel = selections[cat];
            return (
              <div key={cat} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <input
                  type="checkbox"
                  id={`cat-${cat}`}
                  checked={sel.checked}
                  onChange={() => toggleCategory(cat)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`cat-${cat}`} className="flex-1 text-sm font-medium text-gray-800 cursor-pointer">
                  {cat}
                </label>
                {sel.checked && (
                  <select
                    value={sel.count}
                    onChange={(e) => setCount(cat, Number(e.target.value))}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} questions
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!anySelected || generating}
          className="w-full mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? 'Generating questions…' : 'Generate Questions'}
        </button>
      </div>
    );
  }
  ```
  > Note: Check the existing Button component at `client/src/components/ui/Button.tsx` and use it instead of a raw `<button>` if the project exports a reusable component. Match the style conventions of adjacent components.

- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewCategorySelector.tsx
  git commit -m "feat: add InterviewCategorySelector component"
  ```

---

## Task 6 — InterviewAnswerPanel Component

**Files:** `client/src/components/jobs/InterviewAnswerPanel.tsx` (create)

This component handles the answer input, submission, loading, and feedback display for a **single question**. It is self-contained and communicates back to the parent only to request a "Try Again" clear.

- [ ] Create `client/src/components/jobs/InterviewAnswerPanel.tsx`:
  ```typescript
  import { useState } from 'react';
  import { CheckCircle, AlertCircle, RefreshCw, Lightbulb } from 'lucide-react';
  import { InterviewQuestion, InterviewFeedback } from '../../types';
  import { submitAnswer, clearAnswer } from '../../api/interviewPrep';
  import { useAppStore } from '../../store/useAppStore';

  interface Props {
    jobId: string;
    categoryName: string;
    questionIndex: number;
    question: InterviewQuestion;
    onAnswerSaved: (feedback: InterviewFeedback, answer: string) => void;
    onCleared: () => void;
  }

  export function InterviewAnswerPanel({
    jobId,
    categoryName,
    questionIndex,
    question,
    onAnswerSaved,
    onCleared,
  }: Props) {
    const addToast = useAppStore((s) => s.addToast);
    const [draft, setDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [clearing, setClearing] = useState(false);

    const hasFeedback = !!question.feedback;

    const handleSubmit = async () => {
      if (!draft.trim()) return;
      setSubmitting(true);
      try {
        const { feedback } = await submitAnswer({
          jobId,
          categoryName,
          questionIndex,
          question: question.question,
          answer: draft.trim(),
        });
        onAnswerSaved(feedback, draft.trim());
        setDraft('');
      } catch {
        addToast({ message: 'Failed to evaluate answer. Please try again.', type: 'error' });
      } finally {
        setSubmitting(false);
      }
    };

    const handleClear = async () => {
      setClearing(true);
      try {
        await clearAnswer(jobId, categoryName, questionIndex);
        onCleared();
      } catch {
        addToast({ message: 'Failed to clear answer.', type: 'error' });
      } finally {
        setClearing(false);
      }
    };

    if (hasFeedback && question.feedback) {
      const { strengths, improvements, sampleResponse } = question.feedback;
      return (
        <div className="mt-3 space-y-3">
          {/* User's submitted answer */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Your answer</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.userAnswer}</p>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">What you did well</span>
              </div>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-800 flex gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Areas to strengthen</span>
              </div>
              <ul className="space-y-1">
                {improvements.map((s, i) => (
                  <li key={i} className="text-sm text-amber-800 flex gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample response */}
          {sampleResponse && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Stronger response</span>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">{sampleResponse}</p>
            </div>
          )}

          {/* Try again */}
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {clearing ? 'Clearing…' : 'Try again'}
          </button>
        </div>
      );
    }

    // Input state (no feedback yet)
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your answer here…"
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Getting feedback…' : 'Submit for Feedback'}
        </button>
      </div>
    );
  }
  ```

- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewAnswerPanel.tsx
  git commit -m "feat: add InterviewAnswerPanel component with answer input and feedback display"
  ```

---

## Task 7 — InterviewQuestionsView Component

**Files:** `client/src/components/jobs/InterviewQuestionsView.tsx` (create)

This component renders expandable category cards. Each question item shows the question text and mounts an `InterviewAnswerPanel`. When feedback comes back from the panel, the local category state is updated so the UI reflects the saved answer immediately without a full refetch.

- [ ] Create `client/src/components/jobs/InterviewQuestionsView.tsx`:
  ```typescript
  import { useState } from 'react';
  import { ChevronDown, ChevronUp } from 'lucide-react';
  import { InterviewCategory, InterviewFeedback, InterviewQuestion } from '../../types';
  import { InterviewAnswerPanel } from './InterviewAnswerPanel';

  interface Props {
    jobId: string;
    categories: InterviewCategory[];
    onRegenerate: () => void;
    regenerating: boolean;
  }

  export function InterviewQuestionsView({ jobId, categories: initialCategories, onRegenerate, regenerating }: Props) {
    // Local copy so we can patch individual questions after feedback without a full refetch
    const [categories, setCategories] = useState<InterviewCategory[]>(initialCategories);
    const [openCategories, setOpenCategories] = useState<Set<string>>(
      () => new Set(initialCategories.map((c) => c.name))
    );
    const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

    const toggleCategory = (name: string) => {
      setOpenCategories((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    };

    const toggleQuestion = (key: string) => {
      setOpenQuestions((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    const patchQuestion = (catName: string, qIndex: number, patch: Partial<InterviewQuestion>) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === catName
            ? {
                ...cat,
                questions: cat.questions.map((q, i) =>
                  i === qIndex ? { ...q, ...patch } : q
                ),
              }
            : cat
        )
      );
    };

    const answeredCount = categories.reduce(
      (sum, c) => sum + c.questions.filter((q) => !!q.feedback).length,
      0
    );
    const totalCount = categories.reduce((sum, c) => sum + c.questions.length, 0);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {answeredCount}/{totalCount} answered
          </p>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
          >
            {regenerating ? 'Resetting…' : 'Regenerate'}
          </button>
        </div>

        {categories.map((cat) => {
          const isCatOpen = openCategories.has(cat.name);
          const catAnswered = cat.questions.filter((q) => !!q.feedback).length;
          return (
            <div key={cat.name} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.name)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                    {catAnswered}/{cat.questions.length}
                  </span>
                </div>
                {isCatOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Questions list */}
              {isCatOpen && (
                <div className="divide-y divide-gray-100">
                  {cat.questions.map((q, qIndex) => {
                    const qKey = `${cat.name}-${qIndex}`;
                    const isQOpen = openQuestions.has(qKey);
                    return (
                      <div key={qIndex} className="px-4 py-3">
                        {/* Question row */}
                        <button
                          onClick={() => toggleQuestion(qKey)}
                          className="w-full flex items-start justify-between gap-3 text-left"
                        >
                          <span className="text-sm text-gray-700 leading-relaxed flex-1">
                            {qIndex + 1}. {q.question}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {q.feedback && (
                              <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                                answered
                              </span>
                            )}
                            {isQOpen ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Answer panel */}
                        {isQOpen && (
                          <InterviewAnswerPanel
                            jobId={jobId}
                            categoryName={cat.name}
                            questionIndex={qIndex}
                            question={q}
                            onAnswerSaved={(feedback, answer) =>
                              patchQuestion(cat.name, qIndex, { feedback, userAnswer: answer })
                            }
                            onCleared={() =>
                              patchQuestion(cat.name, qIndex, { feedback: undefined, userAnswer: undefined })
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  ```

- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewQuestionsView.tsx
  git commit -m "feat: add InterviewQuestionsView with per-question answer panels"
  ```

---

## Task 8 — InterviewPrepPanel (Orchestrator)

**Files:** `client/src/components/jobs/InterviewPrepPanel.tsx` (create)

- [ ] Create `client/src/components/jobs/InterviewPrepPanel.tsx`:
  ```typescript
  import { useState, useEffect } from 'react';
  import { useQuery, useQueryClient } from '@tanstack/react-query';
  import { Briefcase } from 'lucide-react';
  import { InterviewCategorySelector } from './InterviewCategorySelector';
  import { InterviewQuestionsView } from './InterviewQuestionsView';
  import {
    getInterviewPrep,
    deleteInterviewPrep,
    generateCategories,
    generateQuestions,
  } from '../../api/interviewPrep';
  import { useAppStore } from '../../store/useAppStore';

  interface Props {
    jobId: string;
    hasDescription: boolean;
  }

  type Step = 'idle' | 'selecting' | 'done';

  export function InterviewPrepPanel({ jobId, hasDescription }: Props) {
    const queryClient = useQueryClient();
    const addToast = useAppStore((s) => s.addToast);

    const { data: existingPrep, isLoading } = useQuery({
      queryKey: ['interviewPrep', jobId],
      queryFn: () => getInterviewPrep(jobId),
    });

    const [step, setStep] = useState<Step>('idle');
    const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [generatingQuestions, setGeneratingQuestions] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    // Sync step with loaded data
    useEffect(() => {
      if (existingPrep && existingPrep.categories?.length > 0) {
        setStep('done');
      }
    }, [existingPrep]);

    const handleStartPrep = async () => {
      setLoadingCategories(true);
      try {
        const { categories } = await generateCategories(jobId);
        setSuggestedCategories(categories);
        setStep('selecting');
      } catch {
        addToast({ message: 'Failed to generate categories. Please try again.', type: 'error' });
      } finally {
        setLoadingCategories(false);
      }
    };

    const handleGenerate = async (selections: Array<{ name: string; questionCount: number }>) => {
      setGeneratingQuestions(true);
      try {
        await generateQuestions(jobId, selections);
        await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
        setStep('done');
      } catch {
        addToast({ message: 'Failed to generate questions. Please try again.', type: 'error' });
      } finally {
        setGeneratingQuestions(false);
      }
    };

    const handleRegenerate = async () => {
      setRegenerating(true);
      try {
        await deleteInterviewPrep(jobId);
        queryClient.removeQueries({ queryKey: ['interviewPrep', jobId] });
        setSuggestedCategories([]);
        setStep('idle');
      } catch {
        addToast({ message: 'Failed to reset interview prep.', type: 'error' });
      } finally {
        setRegenerating(false);
      }
    };

    return (
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Interview Prep</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        ) : step === 'idle' ? (
          <div className="text-center py-4">
            {!hasDescription ? (
              <p className="text-sm text-gray-500">
                Add a job description to generate interview prep questions.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Generate tailored interview questions based on this job and your profile.
                </p>
                <button
                  onClick={handleStartPrep}
                  disabled={loadingCategories}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingCategories ? 'Analyzing job…' : 'Prepare for Interview'}
                </button>
              </>
            )}
          </div>
        ) : step === 'selecting' ? (
          <InterviewCategorySelector
            categories={suggestedCategories}
            onGenerate={handleGenerate}
            generating={generatingQuestions}
          />
        ) : existingPrep ? (
          <InterviewQuestionsView
            jobId={jobId}
            categories={existingPrep.categories}
            onRegenerate={handleRegenerate}
            regenerating={regenerating}
          />
        ) : null}
      </div>
    );
  }
  ```
  > Note: Check how `useAppStore` exports `addToast` in the actual codebase and match the call signature exactly (look at `client/src/store/useAppStore.ts`).

- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewPrepPanel.tsx
  git commit -m "feat: add InterviewPrepPanel orchestrator component"
  ```

---

## Task 9 — Wire into JobDetailPage

**Files:** `client/src/pages/JobDetailPage.tsx` (modify)

- [ ] Read `client/src/pages/JobDetailPage.tsx` fully to understand the existing layout before making edits.
- [ ] Add import at the top of the file:
  ```typescript
  import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';
  ```
- [ ] In the JSX main column (the `md:col-span-2` or equivalent `space-y-4` div), add the panel after the Fit Analysis block and before the Notes card:
  ```tsx
  <InterviewPrepPanel
    jobId={job.id}
    hasDescription={!!job.description}
  />
  ```
- [ ] Verify the TypeScript compiler is happy:
  ```bash
  cd client && npx tsc --noEmit
  ```
  Expected: no errors.
- [ ] Commit:
  ```bash
  git add client/src/pages/JobDetailPage.tsx
  git commit -m "feat: wire InterviewPrepPanel into JobDetailPage"
  ```

---

## Potential Pitfalls

- **Prisma client regeneration:** After `migrate dev`, the Prisma client is regenerated automatically. Restart the dev server before testing routes that use `prisma.interviewPrep`.
- **Import path for prisma in route files:** Check how other route files import prisma (e.g., `jobs.ts`) — it might be `'../lib/prisma'` or a barrel export. Use the same pattern.
- **`upsert` requires `@unique` on `jobId`:** Confirmed in the schema above. If Prisma throws an error about the `where` clause, verify the `@unique` annotation is present on `jobId` in `schema.prisma`.
- **React Query cache invalidation after delete:** Using `queryClient.removeQueries` before resetting state ensures the `useQuery` re-fetches fresh `null` data instead of showing stale prep.
- **`addToast` signature:** Check `useAppStore.ts` — the toast call signature may be `addToast({ message, type })` or just `addToast(message)`. Match exactly.
- **Rate limiting:** Each answer submission costs 1 AI call (on top of 2 for the initial flow). With 10 req/15 min per user, a user prepping 8 questions consecutively would hit the limit. Consider surfacing a user-friendly "slow down" message when the 429 is returned.
- **Local state vs server state in InterviewQuestionsView:** The component holds a local copy of `categories` and patches it on feedback to avoid a full refetch. This means if the user has two tabs open, the second tab won't update. This is acceptable for now — do not add cross-tab sync.
- **`question` field in `/interview-feedback` body:** The Zod schema must include `question: z.string()` so the server has the question text to pass to the AI. The client sends both the question text and the answer.
- **`components/jobs/` directory:** This directory does not currently exist. Create it by placing the first file inside it — the filesystem will create the directory automatically.
