# Job Prep Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move interview prep to its own `/jobs/:id/prep` route, add custom category/question creation, remove the regenerate button, and expose a "Generate sample response" button on every question.

**Architecture:** All changes are client-only (server endpoints already exist). The work touches the type layer, API client, two page components, one orchestrator component, and two leaf components. Tasks proceed bottom-up: types → API → leaf components → orchestrator → pages → routing.

**Tech Stack:** React 18, TypeScript, React Router v7, React Query (`@tanstack/react-query`), Axios, Lucide icons, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/types/index.ts` | Modify | Add `sampleResponse?: string` to `InterviewQuestion` |
| `client/src/api/interviewPrep.ts` | Modify | Add `addQuestion` and `generateSampleResponse` API functions |
| `client/src/components/jobs/InterviewAnswerPanel.tsx` | Modify | Add `hasDescription` prop; show sample response card + generate button in both states |
| `client/src/components/jobs/InterviewQuestionsView.tsx` | Modify | Remove regenerate props; add `hasDescription` prop; add inline add-category and add-question forms |
| `client/src/components/jobs/InterviewPrepPanel.tsx` | Modify | Remove regenerate state/handler/import; thread `hasDescription` to `InterviewQuestionsView` |
| `client/src/pages/JobPrepPage.tsx` | Create | Standalone page: fetches job, renders `InterviewPrepPanel` |
| `client/src/pages/JobDetailPage.tsx` | Modify | Remove `InterviewPrepPanel`; add "Interview Prep →" link |
| `client/src/App.tsx` | Modify | Register `/jobs/:id/prep` route |

---

### Task 1: Add `sampleResponse` to `InterviewQuestion` type

**Files:**
- Modify: `client/src/types/index.ts`

This field is stored flat on the question by the server's `/ai/interview-sample-response` endpoint (separate from `InterviewFeedback.sampleResponse`).

- [ ] **Step 1: Open the type file and locate `InterviewQuestion`**

It's around line 136:
```ts
export interface InterviewQuestion {
  question: string;
  userAnswer?: string;
  feedback?: InterviewFeedback;
}
```

- [ ] **Step 2: Add the new optional field**

```ts
export interface InterviewQuestion {
  question: string;
  userAnswer?: string;
  feedback?: InterviewFeedback;
  sampleResponse?: string;
}
```

- [ ] **Step 3: Verify TypeScript is happy**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing errors unrelated to this change)

- [ ] **Step 4: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add sampleResponse field to InterviewQuestion type"
```

---

### Task 2: Add `addQuestion` and `generateSampleResponse` to the API client

**Files:**
- Modify: `client/src/api/interviewPrep.ts`

The server endpoints are:
- `PATCH /api/interview-prep/:jobId/add-question` — body: `{ categoryName, question }`; returns the full updated `InterviewPrep`
- `POST /api/ai/interview-sample-response` — body: `{ jobId, categoryName, questionIndex, question }`; returns `{ sampleResponse: string, prep: InterviewPrep }`

- [ ] **Step 1: Add both functions at the bottom of the file**

```ts
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add client/src/api/interviewPrep.ts
git commit -m "feat: add addQuestion and generateSampleResponse API functions"
```

---

### Task 3: Update `InterviewAnswerPanel` — add `hasDescription` prop and sample response UI

**Files:**
- Modify: `client/src/components/jobs/InterviewAnswerPanel.tsx`

The panel has two render paths: the feedback view (after answer submitted) and the input view (before). The sample response button/card must appear in both. `generateSampleResponse` from the API module must be imported.

- [ ] **Step 1: Update imports and Props interface**

Add `generateSampleResponse` to the import from `../../api/interviewPrep` and add `hasDescription` to `Props`:

```ts
import { submitAnswer, clearAnswer, generateSampleResponse } from '../../api/interviewPrep';

interface Props {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: InterviewQuestion;
  hasDescription: boolean;
  onAnswerSaved: (feedback: InterviewFeedback, answer: string) => void;
  onCleared: () => void;
  onSampleResponseGenerated: (sampleResponse: string) => void;
}
```

Note: `onSampleResponseGenerated` lets the parent (`InterviewQuestionsView`) patch local state without a query invalidation, preserving accordion open state.

- [ ] **Step 2: Add local state for sample response generation**

Inside the component body, after the existing state declarations:

```ts
const [generatingSample, setGeneratingSample] = useState(false);
```

- [ ] **Step 3: Add the generate handler**

```ts
const handleGenerateSample = async () => {
  setGeneratingSample(true);
  try {
    const { sampleResponse } = await generateSampleResponse({
      jobId,
      categoryName,
      questionIndex,
      question: question.question,
    });
    onSampleResponseGenerated(sampleResponse);
  } catch {
    addToast('Failed to generate sample response. Please try again.', 'error');
  } finally {
    setGeneratingSample(false);
  }
};
```

- [ ] **Step 4: Add the sample response card helper**

This is a small JSX block to render when `question.sampleResponse` is set. Define it as a variable before the return statements so both render paths can use it:

```tsx
const sampleResponseCard = question.sampleResponse ? (
  <div className="bg-blue-50 rounded-lg p-3">
    <div className="flex items-center gap-1.5 mb-2">
      <Lightbulb className="h-4 w-4 text-blue-600" />
      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Sample response</span>
    </div>
    <p className="text-sm text-blue-800 leading-relaxed">{question.sampleResponse}</p>
  </div>
) : null;
```

- [ ] **Step 5: Add the generate button helper**

```tsx
const generateSampleButton = hasDescription && !question.sampleResponse ? (
  <button
    onClick={handleGenerateSample}
    disabled={generatingSample}
    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
  >
    {generatingSample ? 'Generating…' : 'Generate sample response'}
  </button>
) : null;
```

- [ ] **Step 6: Update the feedback render path (after answer submitted)**

In the `if (hasFeedback && question.feedback)` block, append `sampleResponseCard` and `generateSampleButton` after the existing "Try again" button:

```tsx
{/* Sample response (independently generated) */}
{sampleResponseCard}
{generateSampleButton}
```

- [ ] **Step 7: Update the input render path (before answer submitted)**

In the input state `return`, append after the "Submit for Feedback" button:

```tsx
{sampleResponseCard}
{generateSampleButton}
```

- [ ] **Step 8: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```
Expected: TypeScript will report that callers of `InterviewAnswerPanel` are missing the new props — this is expected and will be fixed in the next task.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/jobs/InterviewAnswerPanel.tsx
git commit -m "feat: add sample response generation to InterviewAnswerPanel"
```

---

### Task 4: Update `InterviewQuestionsView` — remove regenerate, add hasDescription, add inline forms

**Files:**
- Modify: `client/src/components/jobs/InterviewQuestionsView.tsx`

This is the largest task. Changes: (a) remove regenerate props, (b) add `hasDescription`, (c) pass it and `onSampleResponseGenerated` to `InterviewAnswerPanel`, (d) add inline add-question form per category, (e) add inline add-category form at the bottom.

- [ ] **Step 1: Update imports**

Add `Plus, X` from `lucide-react` (for add/cancel icons). Also import `addQuestion` from the API and `useQueryClient` from react-query:

```ts
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { InterviewCategory, InterviewFeedback, InterviewQuestion } from '../../types';
import { InterviewAnswerPanel } from './InterviewAnswerPanel';
import { addQuestion } from '../../api/interviewPrep';
import { useAppStore } from '../../store/useAppStore';
```

- [ ] **Step 2: Update the Props interface**

Remove `onRegenerate` and `regenerating`. Add `hasDescription` and `jobId`:

```ts
interface Props {
  jobId: string;
  categories: InterviewCategory[];
  hasDescription: boolean;
}
```

Note: `jobId` was already a prop; just confirm it's included.

- [ ] **Step 3: Update the component signature**

```ts
export function InterviewQuestionsView({ jobId, categories: initialCategories, hasDescription }: Props) {
```

- [ ] **Step 4: Add new state for inline forms**

After the existing state declarations:

```ts
const queryClient = useQueryClient();
const addToast = useAppStore((s) => s.addToast);

// Add-question inline form state per category
const [addingQuestionTo, setAddingQuestionTo] = useState<string | null>(null);
const [newQuestion, setNewQuestion] = useState('');
const [submittingQuestion, setSubmittingQuestion] = useState(false);

// Add-category inline form state
const [addingCategory, setAddingCategory] = useState(false);
const [newCatName, setNewCatName] = useState('');
const [newCatQuestion, setNewCatQuestion] = useState('');
const [catNameError, setCatNameError] = useState('');
const [submittingCategory, setSubmittingCategory] = useState(false);
```

- [ ] **Step 5: Add the `patchSampleResponse` helper (reuses existing `patchQuestion`)**

The existing `patchQuestion` already accepts `Partial<InterviewQuestion>` so it supports `sampleResponse`. Wire it into `onSampleResponseGenerated`:

```ts
const handleSampleResponseGenerated = (catName: string, qIndex: number, sampleResponse: string) => {
  patchQuestion(catName, qIndex, { sampleResponse });
};
```

- [ ] **Step 6: Add the add-question submit handler**

```ts
const handleAddQuestion = async (catName: string) => {
  if (!newQuestion.trim()) return;
  setSubmittingQuestion(true);
  try {
    await addQuestion(jobId, catName, newQuestion.trim());
    await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
    setAddingQuestionTo(null);
    setNewQuestion('');
  } catch {
    addToast('Failed to add question. Please try again.', 'error');
  } finally {
    setSubmittingQuestion(false);
  }
};
```

- [ ] **Step 7: Add the add-category submit handler**

```ts
const handleAddCategory = async () => {
  const trimmedName = newCatName.trim();
  const trimmedQ = newCatQuestion.trim();
  if (!trimmedName || !trimmedQ) return;

  const isDuplicate = categories.some(
    (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    setCatNameError('A category with this name already exists');
    return;
  }
  setCatNameError('');
  setSubmittingCategory(true);
  try {
    await addQuestion(jobId, trimmedName, trimmedQ);
    await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
    setAddingCategory(false);
    setNewCatName('');
    setNewCatQuestion('');
  } catch {
    addToast('Failed to add category. Please try again.', 'error');
  } finally {
    setSubmittingCategory(false);
  }
};
```

- [ ] **Step 8: Remove the regenerate button from the JSX**

Delete these lines from the top of the return (inside the `<div className="space-y-3">`):

```tsx
// DELETE THIS:
<button
  onClick={onRegenerate}
  disabled={regenerating}
  className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
>
  {regenerating ? 'Resetting…' : 'Regenerate'}
</button>
```

Keep the `{answeredCount}/{totalCount} answered` paragraph — just remove the flex container wrapping it and the regenerate button, leaving only the count:

```tsx
<p className="text-sm text-gray-500">
  {answeredCount}/{totalCount} answered
</p>
```

- [ ] **Step 9: Update `InterviewAnswerPanel` usage inside the question list**

Pass the two new props to `InterviewAnswerPanel`:

```tsx
<InterviewAnswerPanel
  jobId={jobId}
  categoryName={cat.name}
  questionIndex={qIndex}
  question={q}
  hasDescription={hasDescription}
  onAnswerSaved={(feedback: InterviewFeedback, answer: string) =>
    patchQuestion(cat.name, qIndex, { feedback, userAnswer: answer })
  }
  onCleared={() =>
    patchQuestion(cat.name, qIndex, { feedback: undefined, userAnswer: undefined })
  }
  onSampleResponseGenerated={(sr: string) =>
    handleSampleResponseGenerated(cat.name, qIndex, sr)
  }
/>
```

- [ ] **Step 10: Add the inline add-question form inside each open category**

After the questions list (inside the `{isCatOpen && (...)}` block), before the closing `</div>`:

```tsx
{/* Add question inline form */}
{addingQuestionTo === cat.name ? (
  <div className="px-4 py-3 border-t border-gray-100 space-y-2">
    <input
      type="text"
      value={newQuestion}
      onChange={(e) => setNewQuestion(e.target.value)}
      placeholder="Enter your question…"
      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      autoFocus
    />
    <div className="flex gap-2">
      <button
        onClick={() => handleAddQuestion(cat.name)}
        disabled={!newQuestion.trim() || submittingQuestion}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submittingQuestion ? 'Adding…' : 'Add'}
      </button>
      <button
        onClick={() => { setAddingQuestionTo(null); setNewQuestion(''); }}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => setAddingQuestionTo(cat.name)}
    className="w-full flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
  >
    <Plus className="h-3.5 w-3.5" />
    Add question
  </button>
)}
```

- [ ] **Step 11: Add the inline add-category form at the bottom of the full list**

After the `{categories.map(...)}` block, before the closing `</div>` of the `space-y-3` container:

```tsx
{/* Add category inline form */}
{addingCategory ? (
  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
    <p className="text-sm font-medium text-gray-700">New category</p>
    <div className="space-y-2">
      <input
        type="text"
        value={newCatName}
        onChange={(e) => { setNewCatName(e.target.value); setCatNameError(''); }}
        placeholder="Category name…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      {catNameError && (
        <p className="text-xs text-red-600">{catNameError}</p>
      )}
      <input
        type="text"
        value={newCatQuestion}
        onChange={(e) => setNewCatQuestion(e.target.value)}
        placeholder="First question…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div className="flex gap-2">
      <button
        onClick={handleAddCategory}
        disabled={!newCatName.trim() || !newCatQuestion.trim() || submittingCategory}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submittingCategory ? 'Adding…' : 'Add'}
      </button>
      <button
        onClick={() => { setAddingCategory(false); setNewCatName(''); setNewCatQuestion(''); setCatNameError(''); }}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <button
    onClick={() => setAddingCategory(true)}
    className="w-full flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
  >
    <Plus className="h-3.5 w-3.5" />
    Add category
  </button>
)}
```

- [ ] **Step 12: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```
Expected: errors will point to `InterviewPrepPanel` passing old props — fixed next task.

- [ ] **Step 13: Commit**

```bash
git add client/src/components/jobs/InterviewQuestionsView.tsx
git commit -m "feat: add custom category/question forms and wire sample response in QuestionsView"
```

---

### Task 5: Update `InterviewPrepPanel` — remove regenerate, thread `hasDescription`

**Files:**
- Modify: `client/src/components/jobs/InterviewPrepPanel.tsx`

- [ ] **Step 1: Remove `deleteInterviewPrep` from the import**

Change:
```ts
import {
  getInterviewPrep,
  deleteInterviewPrep,
  generateCategories,
  generateQuestions,
} from '../../api/interviewPrep';
```
To:
```ts
import {
  getInterviewPrep,
  generateCategories,
  generateQuestions,
} from '../../api/interviewPrep';
```

- [ ] **Step 2: Remove regenerate state and handler**

Delete these lines:
```ts
const [regenerating, setRegenerating] = useState(false);
```
And delete the entire `handleRegenerate` function.

- [ ] **Step 3: Update `InterviewQuestionsView` usage — remove old props, add new ones**

Change:
```tsx
<InterviewQuestionsView
  jobId={jobId}
  categories={existingPrep.categories}
  onRegenerate={handleRegenerate}
  regenerating={regenerating}
/>
```
To:
```tsx
<InterviewQuestionsView
  jobId={jobId}
  categories={existingPrep.categories}
  hasDescription={hasDescription}
/>
```

- [ ] **Step 4: Verify TypeScript is clean**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add client/src/components/jobs/InterviewPrepPanel.tsx
git commit -m "feat: remove regenerate from InterviewPrepPanel, thread hasDescription"
```

---

### Task 6: Create `JobPrepPage`

**Files:**
- Create: `client/src/pages/JobPrepPage.tsx`

Pattern: mirror `JobDetailPage`'s job-fetching approach (`useState` + `useEffect` + `getJob`).

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getJob } from '../api/jobs';
import { JobApplication } from '../types';
import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';

export function JobPrepPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getJob(id)
        .then(setJob)
        .catch(() => setJob(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {job.company ?? 'job'}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{job.title}</h1>
        {job.company && (
          <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
        )}
      </div>

      <InterviewPrepPanel jobId={job.id} hasDescription={!!job.description} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/JobPrepPage.tsx
git commit -m "feat: add JobPrepPage at /jobs/:id/prep"
```

---

### Task 7: Register route and update `JobDetailPage`

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/JobDetailPage.tsx`

- [ ] **Step 1: Add `JobPrepPage` import and route in `App.tsx`**

Add import:
```ts
import { JobPrepPage } from './pages/JobPrepPage';
```

Add route after the `/jobs/:id` route:
```tsx
<Route path="/jobs/:id" element={<JobDetailPage />} />
<Route path="/jobs/:id/prep" element={<JobPrepPage />} />
```

- [ ] **Step 2: Remove `InterviewPrepPanel` from `JobDetailPage.tsx`**

Remove the import line:
```ts
import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';
```

Remove the JSX usage:
```tsx
<InterviewPrepPanel
  jobId={job.id}
  hasDescription={!!job.description}
/>
```

- [ ] **Step 3: Add "Interview Prep →" link in `JobDetailPage`**

In `JobDetailPage`, find the right-column area where `InterviewPrepPanel` used to live and replace it with a navigation card. The card should link to `/jobs/:id/prep`. Use `Link` (already imported from `react-router-dom`). Add the `Briefcase` icon from `lucide-react` to the existing import line.

```tsx
<Link
  to={`/jobs/${job.id}/prep`}
  className="flex items-center justify-between bg-white rounded-xl border shadow-sm p-5 hover:border-blue-300 transition-colors group"
>
  <div className="flex items-center gap-2">
    <Briefcase className="h-5 w-5 text-blue-600" />
    <span className="text-base font-semibold text-gray-900">Interview Prep</span>
  </div>
  <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors rotate-180" />
</Link>
```

Note: `ArrowLeft` is already imported in `JobDetailPage`. Rotating it 180° makes it an arrow-right. Alternatively import `ArrowRight` from lucide-react if preferred.

- [ ] **Step 4: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 5: Smoke test in the browser**

Start dev server:
```bash
npm run dev
```

Check:
1. Navigate to any job → "Interview Prep" card is visible, clicking it goes to `/jobs/:id/prep`
2. `/jobs/:id/prep` renders the prep panel with back link
3. The prep flow (generate categories → generate questions) still works
4. After questions are generated:
   - No "Regenerate" button visible
   - "+ Add question" appears inside each open category
   - "+ Add category" appears at the bottom
5. Expanding a question shows "Generate sample response" button (if job has description)
6. Clicking "Generate sample response" fetches and displays the result

- [ ] **Step 6: Commit**

```bash
git add client/src/App.tsx client/src/pages/JobDetailPage.tsx
git commit -m "feat: register /jobs/:id/prep route and update JobDetailPage with Interview Prep link"
```
