# Job Prep Enhancements — Design Spec
_Date: 2026-03-22_

## Overview

Move interview prep to its own dedicated route and enhance it with user-controlled content (custom categories and questions), a "generate sample response" option available at all times, and removal of the regenerate button.

---

## 1. New Route: `/jobs/:id/prep`

### Goal
Give interview prep its own page rather than embedding it inside the already-dense job detail page.

### Changes
- Add `<Route path="/jobs/:id/prep" element={<JobPrepPage />} />` inside the protected/ProfileGate block in `App.tsx`
- Create `client/src/pages/JobPrepPage.tsx`:
  - Reads `id` from `useParams`
  - Fetches the job (to get `hasDescription`)
  - Renders a page header with a back link to `/jobs/:id`
  - Renders `InterviewPrepPanel` (unchanged interface: `jobId`, `hasDescription`)
- Remove `<InterviewPrepPanel>` from `JobDetailPage.tsx`
- Add a navigation entry point on `JobDetailPage` — a card or button labeled "Interview Prep →" that links to `/jobs/:id/prep`

---

## 2. Remove Regenerate Button

### Changes
- Remove the "Regenerate" button from `InterviewQuestionsView`
- Remove `onRegenerate` and `regenerating` props from `InterviewQuestionsView`
- Remove `handleRegenerate` handler and `regenerating` state from `InterviewPrepPanel`
- Remove `deleteInterviewPrep` import from `InterviewPrepPanel` (no longer needed)

---

## 3. Add Custom Category (inline form)

### UX
- Below the last category accordion in `InterviewQuestionsView`, a small "+ Add category" text button
- Clicking reveals an inline form with two inputs: category name + first question text, plus "Add" and "Cancel" buttons
- On submit: calls `addQuestion(jobId, categoryName, question)` which hits `PATCH /api/interview-prep/:jobId/add-question`
- The server auto-creates the category if it doesn't exist (already implemented)
- On success: invalidate the `interviewPrep` query so the new category appears

### Server
No changes needed — `add-question` endpoint already handles category auto-creation.

---

## 4. Add Custom Question per Category (inline form)

### UX
- Each open category section has a "+ Add question" text button at the bottom of its question list
- Clicking reveals a single-input inline form for the question text + "Add" / "Cancel"
- On submit: calls `addQuestion(jobId, categoryName, question)` with the existing category name
- On success: invalidate query to refresh

### Server
No changes needed.

---

## 5. Generate Sample Response (per question, both states)

### UX
- Available in `InterviewAnswerPanel` in **both** the input state (before submitting) and the feedback state (after submitting)
- **Input state:** "Generate sample response" link shown below the textarea as a secondary option
- **Feedback state:** "Generate sample response" link shown below the feedback cards
- If `question.sampleResponse` is already set (persisted from a prior generation), show it directly without re-fetching
- Clicking triggers `POST /api/ai/interview-sample-response`, shows a loading spinner, then renders the result in a blue info card (same visual style as the existing `sampleResponse` in feedback)
- The generated response is persisted to the DB by the server and returned in the response

### Client changes
- Add `generateSampleResponse(jobId, categoryName, questionIndex, question)` to `client/src/api/interviewPrep.ts`
- Update `InterviewQuestion` type in `client/src/types/index.ts` to include `sampleResponse?: string`
- Update `InterviewAnswerPanel` to accept and handle sample response in both states
- Pass `sampleResponse` from the question object into `InterviewAnswerPanel`; update `patchQuestion` in `InterviewQuestionsView` to support patching `sampleResponse`

### Server
No changes needed — `POST /api/ai/interview-sample-response` already exists and persists to DB.

---

## 6. Client API additions (`client/src/api/interviewPrep.ts`)

```ts
// New
export const addQuestion = (jobId: string, categoryName: string, question: string) =>
  api.patch<InterviewPrep>(`/interview-prep/${jobId}/add-question`, { categoryName, question })
    .then((r) => r.data);

export const generateSampleResponse = (payload: {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: string;
}) =>
  api.post<{ sampleResponse: string; prep: InterviewPrep }>('/ai/interview-sample-response', payload)
    .then((r) => r.data);
```

---

## Files to Create
- `client/src/pages/JobPrepPage.tsx`

## Files to Modify
- `client/src/App.tsx` — add `/jobs/:id/prep` route
- `client/src/pages/JobDetailPage.tsx` — remove `InterviewPrepPanel`, add "Interview Prep →" link
- `client/src/components/jobs/InterviewPrepPanel.tsx` — remove regenerate handler/state
- `client/src/components/jobs/InterviewQuestionsView.tsx` — remove regenerate props, add inline add-category and add-question forms
- `client/src/components/jobs/InterviewAnswerPanel.tsx` — add sample response UI in both states
- `client/src/api/interviewPrep.ts` — add `addQuestion` and `generateSampleResponse`
- `client/src/types/index.ts` — add `sampleResponse?: string` to `InterviewQuestion`

## Files with No Changes Needed
- `server/src/routes/interviewPrep.ts` — `add-question` endpoint already complete
- `server/src/routes/ai.ts` — `interview-sample-response` endpoint already complete
