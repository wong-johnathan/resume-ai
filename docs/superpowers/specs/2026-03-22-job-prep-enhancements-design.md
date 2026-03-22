# Job Prep Enhancements — Design Spec
_Date: 2026-03-22_

## Overview

Move interview prep to its own dedicated route and enhance it with user-controlled content (custom categories and questions), a "generate sample response" option available at all times, and removal of the regenerate button.

---

## 1. New Route: `/jobs/:id/prep`

### Goal
Give interview prep its own page rather than embedding it inside the already-dense job detail page.

### Changes
- Add `<Route path="/jobs/:id/prep" element={<JobPrepPage />} />` inside the protected/ProfileGate block in `App.tsx` (alongside the existing `/jobs/:id` route)
- Create `client/src/pages/JobPrepPage.tsx`:
  - Reads `id` from `useParams`
  - Fetches the job using `useState` + `useEffect` + `getJob(id)` — same pattern as `JobDetailPage` (not React Query)
  - Renders a loading skeleton while the job loads; renders a "Job not found" message if the job is null after loading
  - Renders a page header with a back link to `/jobs/:id`
  - Renders `InterviewPrepPanel` (unchanged interface: `jobId`, `hasDescription`)
- Remove `<InterviewPrepPanel>` from `JobDetailPage.tsx`
- Add a navigation entry point on `JobDetailPage` — a card or button labeled "Interview Prep →" that links to `/jobs/:id/prep`

---

## 2. Remove Regenerate Button

### Changes
- Remove the "Regenerate" button from `InterviewQuestionsView`
- Remove `onRegenerate` and `regenerating` props from `InterviewQuestionsView`
- Remove `handleRegenerate` handler, `regenerating` state, and `deleteInterviewPrep` import from `InterviewPrepPanel`

---

## 3. Add Custom Category (inline form)

### Visibility constraint
The "+ Add category" button is **only visible in the `'done'` step** — i.e., inside `InterviewQuestionsView`, which is only rendered when existing prep has been loaded. It is not available as an alternative to AI generation.

### UX
- Below the last category accordion in `InterviewQuestionsView`, a small "+ Add category" text button
- Clicking reveals an inline form with two inputs: category name + first question text, plus "Add" and "Cancel" buttons
- Both fields are required before "Add" is enabled
- **Duplicate name validation:** Before submitting, the client checks that the entered category name does not already exist in the local `categories` state (case-insensitive). If it matches, show an inline validation message ("A category with this name already exists") and do not submit
- On submit: calls `addQuestion(jobId, categoryName, question)` which hits `PATCH /api/interview-prep/:jobId/add-question`
- The server auto-creates the category if it doesn't exist (already implemented); the endpoint returns HTTP 404 if no prep record exists — but this cannot happen here because the form is only shown when prep already exists
- On success: invalidate the `interviewPrep` query so the new category appears
- On error: show a toast

### Server
No changes needed — `add-question` endpoint already handles category auto-creation.

---

## 4. Add Custom Question per Category (inline form)

### UX
- Each open category section has a "+ Add question" text button at the bottom of its question list
- Clicking reveals a single-input inline form for the question text + "Add" / "Cancel"
- On submit: calls `addQuestion(jobId, categoryName, question)` with the existing category name
- On success: invalidate the `interviewPrep` query to refresh
- On error: show a toast
- Custom questions participate in the existing `answeredCount`/`totalCount` logic naturally

### Server
No changes needed.

---

## 5. Generate Sample Response (per question, both states)

### Type change
Add `sampleResponse?: string` directly to `InterviewQuestion` in `client/src/types/index.ts`. This is separate from `InterviewFeedback.sampleResponse` (which is returned as part of answer evaluation). The standalone sample response is stored flat on the question by the server's `interview-sample-response` endpoint (line 486 of `ai.ts`), independent of whether the user has submitted an answer.

```ts
export interface InterviewQuestion {
  question: string;
  userAnswer?: string;
  feedback?: InterviewFeedback;
  sampleResponse?: string;  // generated independently, persisted by /ai/interview-sample-response
}
```

### UX
- Available in `InterviewAnswerPanel` in **both** the input state (before submitting) and the feedback state (after submitting)
- **Input state:** "Generate sample response" link shown below the textarea as a secondary option
- **Feedback state:** "Generate sample response" link shown below the feedback cards
- If `question.sampleResponse` is already set, display it inline immediately without showing the "Generate" button (the generated response replaces the button once fetched)
- Clicking triggers `generateSampleResponse(...)`, shows a loading state on the button, then renders the result in a blue info card (same visual style as the existing `sampleResponse` in feedback)
- **Requires job description:** The server endpoint returns HTTP 404 if the job has no description. The "Generate sample response" button is **hidden** when `!hasDescription`. To enable this: thread `hasDescription` from `InterviewPrepPanel` → `InterviewQuestionsView` (new prop) → `InterviewAnswerPanel` (new prop). When `!hasDescription`, the button simply does not render.
- **Local state update:** On success, call `patchQuestion(catName, qIndex, { sampleResponse })` — same local-state pattern as `patchQuestion` for feedback, no query invalidation (preserves accordion state)
- `InterviewQuestionsView` passes `question.sampleResponse` into `InterviewAnswerPanel` via the question prop (already passed in full)

### Server
No changes needed — `POST /api/ai/interview-sample-response` already exists and persists to DB.

---

## 6. Client API additions (`client/src/api/interviewPrep.ts`)

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

---

## Files to Create
- `client/src/pages/JobPrepPage.tsx`

## Files to Modify
- `client/src/App.tsx` — add `/jobs/:id/prep` route
- `client/src/pages/JobDetailPage.tsx` — remove `InterviewPrepPanel` import/usage, add "Interview Prep →" link
- `client/src/components/jobs/InterviewPrepPanel.tsx` — remove `handleRegenerate`, `regenerating` state, `deleteInterviewPrep` import, and `onRegenerate`/`regenerating` props passed to `InterviewQuestionsView`
- `client/src/components/jobs/InterviewQuestionsView.tsx` — remove `onRegenerate`/`regenerating` props, add `hasDescription` prop, add inline add-category and add-question forms, update `patchQuestion` calls to support `sampleResponse`, pass `hasDescription` to `InterviewAnswerPanel`
- `client/src/components/jobs/InterviewAnswerPanel.tsx` — add `hasDescription` prop, add sample response display and "Generate sample response" button in both states (hidden when `!hasDescription`)
- `client/src/api/interviewPrep.ts` — add `addQuestion` and `generateSampleResponse`
- `client/src/types/index.ts` — add `sampleResponse?: string` to `InterviewQuestion`

## Files with No Changes Needed
- `server/src/routes/interviewPrep.ts` — `add-question` endpoint already complete
- `server/src/routes/ai.ts` — `interview-sample-response` endpoint already complete
