# Sample Job Generator

**Date:** 2026-03-24
**Status:** Approved

## Overview

Let users generate realistic example job applications using AI, seeded from their profile. Useful for exploring the app's features without needing a real job description. Limited to 3 generations per user lifetime.

---

## Data Model

Add one field to `Profile` in `server/prisma/schema.prisma`:

```prisma
sampleJobsGenerated  Int  @default(0)
```

Run `npm run db:migrate` after schema change.

---

## Server

### New AI service functions — `server/src/services/claude.ts`

**1. `generateSampleJobTitles(profile)`**

Input: profile skills + experience titles (same shape as `analyzeJobFit` uses)

Returns: `string[]` — exactly 5 job titles, ordered least-compatible to most-compatible based on the profile. Each title is plain text (e.g. `"Data Analyst"`, `"Senior Frontend Engineer"`).

Prompt strategy: ask the model to suggest 5 job titles across a compatibility spectrum — from roles missing key skills to roles that are a strong profile match. Return as a JSON array.

**2. `generateSampleJob(jobTitle, profile)`**

Input: chosen job title string + same profile shape

Returns:
```ts
interface SampleJobResult {
  company: string;       // realistic fictional company name
  location: string;      // e.g. "San Francisco, CA (Remote)"
  description: string;   // full realistic JD, ~400-600 words
  fitAnalysis: {
    score: number;
    strengths: string[];
    gaps: string[];
    summary: string;
  };
}
```

Single AI call (`json_object` response format). Company and location are invented but realistic. Description reads like an authentic job posting. `fitAnalysis` is computed in the same call using the profile data — do not call `analyzeJobFit` separately.

---

### New routes — `server/src/routes/ai.ts`

**Route placement:** In `ai.ts`, `router.use(requireAuth)` is on line 12 and `router.use(aiRateLimit)` is on line 21. Express middleware only applies to routes registered **after** a `router.use()` call. Therefore:

- `GET /sample-job-status` and `POST /sample-titles` must be added **between lines 12 and 21** (after `router.use(requireAuth)`, before `router.use(aiRateLimit)`). This exempts them from the AI rate limiter.
- `POST /sample-job` is added after `router.use(aiRateLimit)` as normal, since it makes a real AI call.

---

**`GET /api/ai/sample-job-status`** _(registered before `router.use(aiRateLimit)`)_

Returns current usage for the authenticated user:
```json
{ "generationsUsed": 1, "generationsLimit": 3 }
```

No body. Reads `profile.sampleJobsGenerated`. Returns 404 if no profile. No activity log entry.

---

**`POST /api/ai/sample-titles`** _(registered before `router.use(aiRateLimit)`)_

No request body required.

1. Fetch profile (skills + experiences + `sampleJobsGenerated`)
2. Call `generateSampleJobTitles(profile)`
3. Return `{ titles: string[], generationsUsed: number, generationsLimit: 3 }`

`generationsUsed` is `profile.sampleJobsGenerated` (read directly, no increment).

Does **not** count against the 3-use limit. No activity log entry.

---

**`POST /api/ai/sample-job`** _(registered after `router.use(aiRateLimit)`)_

Request body:
```json
{ "jobTitle": "Senior Frontend Engineer" }
```

Validation: `jobTitle` string, min 2 chars.

1. Fetch profile (skills, experiences, `sampleJobsGenerated`)
2. If `sampleJobsGenerated >= 3` → HTTP 403 `{ error: "Sample job limit of 3 reached." }`
3. Call `generateSampleJob(jobTitle, profile)` — AI call happens **outside** the transaction; if it fails, no DB writes occur and the counter is not incremented
4. Fetch the user's first `UserJobStatus` ordered by `order asc` to use as the initial status label; fall back to `"SAVED"` if none exist
5. In a **single Prisma transaction**: create `JobApplication` record + `prisma.profile.update({ data: { sampleJobsGenerated: { increment: 1 } } })`
6. Return `{ job: JobApplication, generationsUsed: profile.sampleJobsGenerated + 1, generationsLimit: 3 }`
   - `generationsUsed` is the pre-fetch value + 1. This is best-effort (matches the `generate-summary` pattern) — the client uses it only for display purposes.

Job record created with:
- `jobTitle`: `(EXAMPLE) ${jobTitle}` (AI-provided title, prefixed)
- `company`: from AI
- `location`: from AI
- `description`: from AI
- `fitAnalysis`: from AI
- `status`: first `UserJobStatus.label` (lowest `order`) or `"SAVED"`
- `userId`: authenticated user

No activity log entry for sample job creation.

---

## Client

### New API functions — `client/src/api/ai.ts`

```ts
export const getSampleJobStatus = () =>
  api.get<{ generationsUsed: number; generationsLimit: number }>('/ai/sample-job-status').then(r => r.data);

export const getSampleTitles = () =>
  api.post<{ titles: string[]; generationsUsed: number; generationsLimit: number }>('/ai/sample-titles').then(r => r.data);

export const createSampleJob = (jobTitle: string) =>
  api.post<{ job: JobApplication; generationsUsed: number; generationsLimit: number }>('/ai/sample-job', { jobTitle }).then(r => r.data);
```

---

### New component — `client/src/components/jobs/SampleJobModal.tsx`

Props:
```ts
interface SampleJobModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobApplication) => void;
  initialUsed: number; // passed from parent, avoids duplicate fetch
}
```

**Step 1 — Choose a title**
- On open: calls `getSampleTitles()`, shows loading spinner
- Renders 5 title pills ranked least → most compatible; first pill labelled "Least compatible", last labelled "Best match"
- Free-text input below: "Or enter your own title…"; typing deselects pills
- A title pill click deselects any custom text
- "Generate Sample →" button — disabled until a title is selected or custom text is entered, AND `generationsUsed < 3`
- **Once a preview has been generated in this session**, the "Generate Sample →" button is disabled on back-navigation with label "Already generated — open the job below ↓"; this prevents double-spending a use in the same modal session
- Shows usage: `{3 - generationsUsed} generation(s) remaining`
- If `generationsUsed >= 3`: replace button with a limit message; title pills and input are still shown for reference but non-interactive

**Step 2 — Preview**
- Calls `createSampleJob(selectedTitle)`, shows spinner "Generating sample job…"
- On success: shows read-only preview card:
  - Job title (with `(EXAMPLE)` prefix), company, location
  - Fit score donut (reuse `FitScoreDonut` component) + summary
  - Job description (truncated to 5 lines, expandable — same `line-clamp-5` + toggle pattern as info tab)
- "← Back" button: returns to Step 1 with a notice "This generation has already been used." The "Generate Sample →" button in Step 1 will be disabled as described above
- "Open Job →" button: calls `onCreated(job)` then closes the modal
- Error state: inline error message with "Try Again" button that re-calls `createSampleJob` with the same title

---

### Changes — `client/src/pages/JobTrackerPage.tsx`

1. On mount (alongside existing `getJobs/getJobStatuses`): call `getSampleJobStatus()`, store `generationsUsed` and `generationsLimit` in state. Handle errors silently (log, don't toast).

2. Add "Try Sample" button in the header row (between "Statuses" and "Add Job"):
   - Label: `Try Sample`
   - Shows remaining badge in muted text: e.g. `2 / 3`
   - Disabled when `generationsUsed >= generationsLimit`
   - Opens `SampleJobModal` with `initialUsed={generationsUsed}`

3. `SampleJobModal.onCreated`: navigate immediately to `/jobs/{job.id}` — no need to prepend to the jobs list state since the page is navigated away from.

4. Import and render `<SampleJobModal>`.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Profile not found (404) | Toast "Profile not found", close modal |
| Limit reached (403) | Show limit message in modal Step 1 |
| AI call fails | Inline error in Step 2, "Try Again" button |
| Network error on status fetch | Silent fail — button shows without a count badge |

---

## Files Changed

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `sampleJobsGenerated Int @default(0)` to Profile |
| `server/src/services/claude.ts` | Add `generateSampleJobTitles`, `generateSampleJob` |
| `server/src/routes/ai.ts` | Add 3 new routes (2 before rate limiter, 1 after) |
| `client/src/api/ai.ts` | Add `getSampleJobStatus`, `getSampleTitles`, `createSampleJob` |
| `client/src/components/jobs/SampleJobModal.tsx` | New two-step modal component |
| `client/src/pages/JobTrackerPage.tsx` | Fetch status on mount, add "Try Sample" button, render modal |
