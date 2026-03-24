# Job-Centric Flow Redesign

**Date:** 2026-03-24
**Status:** Approved
**Approach:** Option B — Job-Scoped Output Table

---

## Objective

Simplify the resume and cover letter experience into a job-centric workspace. Every tailored output belongs to a job, lives inside the job detail page, and templates are applied only at export time.

**Current flow:** Job Details → Resume selection → AI Enhancement
**New flow:** Job Details → AI Enhancement (optional) → Review & Export within Job

---

## Data Model

### New Table: `JobOutput`

```prisma
model JobOutput {
  id                   String   @id @default(cuid())
  jobId                String   @unique
  userId               String
  resumeJson           Json?
  coverLetterText      String?
  resumeVersion        Int      @default(0)
  coverLetterVersion   Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  job  JobApplication @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- One `JobOutput` per job — created in the same transaction as the job, with all nullable fields null until AI generates content
- `resumeVersion` and `coverLetterVersion` are independent counters, each capped at 3
- Manual inline edits do NOT increment version counters
- **Behavior change vs. current:** The existing `AiAmendment` limit was 3 total per job (resume tailors + cover letter combined). The new model allows 3 resume tailors AND 3 cover letter generations independently. This is intentional — users who previously exhausted their limit will regain capacity after migration.
- `resumeJson` uses the same `ResumeContent` JSON schema as the existing `Resume.contentJson` field — same structure, same rendering pipeline

### `JobApplication` changes

- Remove `resumeId` foreign key (no longer links to `Resume` table)
- Remove `coverLetter` text field (moves to `JobOutput.coverLetterText`)

### `Resume` table

- Unchanged for base resumes (ResumesPage)
- Existing tailored resumes (`tailoredFor` is set) are migrated to `JobOutput` and then deleted
- `templateId` is never stored on job outputs — passed as a query param at export time only

### Removed: `AiAmendment` table

Replaced by version counters on `JobOutput`. Per-amendment history is no longer tracked; version counts enforce the limit.

### Removed fields on `Resume`

`tailorChanges` and `tailorSourceSnapshot` are not migrated. They exist only on tailored `Resume` records which are being removed. The new flow does not surface a diff view.

### Removed component: `TailorChangesPanel`

This component renders `tailorChanges` diff data. It should be removed as part of this refactor — the new job detail tab has no equivalent diff panel.

### Migration Plan

> **Pre-migration backup required.** Run a full database backup before executing any migration steps. Steps 5–8 are irreversible.

All data migration steps (2–5) must be implemented as a **Prisma migration script** (`migration.ts`) run after the schema migration — not as raw SQL, because `cuid()` is an application-layer function unavailable in PostgreSQL.

1. Create `JobOutput` table via Prisma schema migration (`npx prisma migrate dev`)
2. **Backfill `JobOutput` rows** for all existing jobs — run in a single Prisma transaction:
   - For jobs with a linked tailored resume (`resumeId` set, `Resume.tailoredFor IS NOT NULL`):
     - Create `JobOutput` with `resumeJson = Resume.contentJson`, `resumeVersion = 1`
   - For jobs with `coverLetter` set:
     - Upsert `JobOutput` (create or update the row from above): `coverLetterText = coverLetter`, `coverLetterVersion = 1`
   - For all remaining jobs (no tailored resume, no cover letter):
     - Create `JobOutput` with all nullable fields null
   - The upsert key is `jobId` — `ON CONFLICT ("jobId") DO UPDATE SET ...`
3. For jobs with `resumeId` pointing to a **base** resume (`Resume.tailoredFor IS NULL`): the link is lost — base resumes are not job-scoped. **Log a count** of affected jobs to stdout before proceeding.
4. Drop `AiAmendment` table first (it has FK references to `Resume`; dropping it before tailored resumes avoids FK constraint violations)
5. Delete tailored `Resume` records (where `tailoredFor IS NOT NULL`)
6. Drop `resumeId` and `coverLetter` columns from `JobApplication` via Prisma migration

---

## API Layer

### Modified: `POST /api/jobs`

Now creates a `JobOutput` row in the same database transaction as the `JobApplication`. The `JobOutput` starts with all nullable fields null. No separate call needed from the client.

### New Routes

```
GET  /api/jobs/:id/output
  Auth: requireAuth + job ownership check
  Returns JobOutput (resumeJson, coverLetterText, resumeVersion, coverLetterVersion)
  Post-migration: a missing JobOutput is an error (500) — the transaction guarantee means it should always exist
  Pre-migration legacy jobs only: if no JobOutput row exists, return { resumeJson: null, coverLetterText: null, resumeVersion: 0, coverLetterVersion: 0 } as a one-time fallback until migration completes

POST /api/ai/tailor
  Auth: requireAuth
  Body: { jobId }                        ← CHANGED: removed templateId and jobDescription
  Reads job.description + user profile from DB (caller no longer passes these)
  Generates tailored resumeJson content
  Upserts JobOutput.resumeJson, increments resumeVersion
  Returns 403 if resumeVersion >= 3

POST /api/ai/cover-letter
  Auth: requireAuth
  Body: { jobId, tone }                  ← CHANGED: removed jobDescription (read from job record)
  Check coverLetterVersion < 3 BEFORE starting the stream — return 403 immediately if at limit
  SSE stream: version counter increments only on successful stream completion (final SSE event)
  On partial failure / stream abort: do NOT increment counter; do NOT persist partial text
  On stream complete: upserts JobOutput.coverLetterText, increments coverLetterVersion

GET  /api/jobs/:id/resume/pdf?templateId=xxx
  Auth: requireAuth + job ownership
  Reads JobOutput.resumeJson; if null, renders from user's current profile data
  Applies templateId at render time via existing renderTemplate() pipeline
  Returns PDF via Puppeteer

GET  /api/jobs/:id/resume/preview?templateId=xxx
  Auth: requireAuth + job ownership
  Same as above but returns rendered HTML string (for live preview)
  Client renders preview using <iframe srcdoc={html}> to avoid session/cookie issues

GET  /api/jobs/:id/cover-letter/pdf
  Auth: requireAuth + job ownership
  Reads JobOutput.coverLetterText
  Renders using a new `coverLetterTemplate()` function in `src/services/templates.ts`
  Template: minimal HTML — user name/contact header, date, body text, standard margins, serif readable font
  Returns PDF via Puppeteer

PATCH /api/jobs/:id/output
  Auth: requireAuth + job ownership
  Body: { resumeJson?, coverLetterText? }
  Server validates resumeJson against ResumeContent schema if present — returns 400 on invalid
  If both fields are omitted: returns 400 (no-op write is not allowed)
  Last-write-wins; no optimistic locking — concurrent AI generation and manual edit may overwrite each other (acceptable trade-off)
  Does NOT increment version counters
```

### Modified Routes

```
POST /api/ai/analyze-fit
  Body: { jobId }                        ← CHANGED: removed resumeId parameter
  Now reads profile data only (resumeId pointed to tailored resumes which no longer exist as Resume records)
  Fit analysis is profile-vs-job, not tailored-resume-vs-job
```

Client-side: update `client/src/api/ai.ts` `analyzeFit()` wrapper to remove `resumeId` parameter. Update all call sites.

### Removed Routes

- `PUT /api/jobs/:id/resume` — no longer needed
- `POST /api/ai/tailor` no longer creates `Resume` records
- Activity logging: remove `RESUME_CREATED` / `RESUME_DELETED` calls from the tailor route; do not add a replacement (activity log for AI actions is removed entirely as part of this refactor)

### Unchanged

- All `/api/resumes` routes (serve ResumesPage base resumes only)
- Interview prep, sample job, fit analysis (body contract change noted above), tour routes
- Rate limiting: 10 req/15 min per user across AI routes (unchanged; the effective per-job AI call count increases from 3 to 6 but rate limit is per-user-per-window, not per-job)

---

## Client TypeScript Types

Add to `client/src/types/index.ts`:

```typescript
export interface JobOutput {
  id: string;
  jobId: string;
  // userId intentionally omitted — clients do not need it
  resumeJson: ResumeContent | null;
  coverLetterText: string | null;
  resumeVersion: number;
  coverLetterVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Remove `coverLetter` from the `JobApplication` interface. Remove `resumeId` from the `JobApplication` interface.

Add `getJobOutput(jobId: string): Promise<JobOutput>` to `client/src/api/jobs.ts`.
Add `patchJobOutput(jobId: string, data: Partial<Pick<JobOutput, 'resumeJson' | 'coverLetterText'>>): Promise<JobOutput>` to `client/src/api/jobs.ts`.

---

## UI & Components

### Job Creation Modal — Step Sequencing

The modal collects details in Step 1 but does **not** save until the user completes Step 2 and clicks "Save."

1. User fills Step 1 (Job Details) and clicks "Next" — no API call yet
2. User configures Step 2 (AI Enhancement toggles) and clicks "Save"
3. `POST /api/jobs` fires — creates `JobApplication` + empty `JobOutput` in one transaction
4. If tailor toggle is on: `POST /api/ai/tailor` fires with the returned `jobId`
5. If cover letter toggle is on: `POST /api/ai/cover-letter` fires with the returned `jobId`
6. On completion, navigate to `/jobs/:id`

Steps 4 and 5 can fire in parallel if both toggles are on.

**Failure handling:** If step 3 (`POST /api/jobs`) fails, show an error and keep the modal open. If step 3 succeeds but step 4 or 5 fails (AI call error), navigate to the job detail page anyway and show an inline error banner in the relevant section (Resume or Cover Letter). The job is already created — partial AI failure is recoverable from within the job detail page.

### Job Creation Modal

Simplified from 3 steps to 2:

**Step 1: Job Details** (unchanged)
- company, jobTitle, location, salary, jobUrl, description, status

**Step 2: AI Enhancement** (replaces Resume + Cover Letter steps)
- Toggle: "Tailor Resume to this job"
- Toggle: "Generate Cover Letter"
- Tone selector (shown when cover letter toggle is on)
- Disclaimer: *"This will not modify your profile. All enhancements are editable within the job."*
- User may skip both — job is saved with an empty `JobOutput`

### Job Detail Page — Resume & Cover Letter Tab

**Resume Section**

- No output: "Generate Tailored Resume" button + "Export from Profile" button
  - "Export from Profile" calls the same `GET /api/jobs/:id/resume/pdf` endpoint; the fallback to profile data is handled server-side
- Output exists: `JobOutputEditor` component rendering `resumeJson` content as editable sections
  - "Re-tailor" button (disabled when `resumeVersion >= 3`)
  - Version badge: e.g., "Version 2 / 3"
  - "Download Resume" → opens `ExportModal`

**Cover Letter Section**

- No output: "Generate Cover Letter" button with inline tone selector
- Output exists: Editable `<textarea>` bound to `coverLetterText`
  - "Regenerate" button (disabled when `coverLetterVersion >= 3`)
  - "Download Cover Letter" → opens `CoverLetterExportModal`

### Component Details

**`JobOutputEditor`**

Renders `resumeJson` (type: `ResumeContent`) as a section-by-section editor — same editing pattern as `ResumeEditPage`. **Reuses existing TipTap editor components** from `ResumeEditPage` rather than reimplementing them; the difference is the save target (`PATCH /api/jobs/:id/output` instead of `PUT /api/resumes/:id`). Each section (summary, experience bullets, skills, education) is independently editable. On save, calls `PATCH /api/jobs/:id/output` with the updated `resumeJson`.

**`ExportModal`**

- Template grid: thumbnails of available templates (same list used in ResumesPage)
- Live preview: `<iframe srcdoc={previewHtml}>` where `previewHtml` is fetched from `GET /api/jobs/:id/resume/preview?templateId=xxx` on template selection
- Template selection is debounced (300ms) before triggering a preview fetch; in-flight requests are cancelled (AbortController) when a new selection arrives; iframe shows a loading spinner while fetching
- "Download PDF" button: calls `GET /api/jobs/:id/resume/pdf?templateId=xxx`

**`CoverLetterExportModal`**

- Simple modal with optional style selector (font/spacing)
- "Download PDF" button: calls `GET /api/jobs/:id/cover-letter/pdf`

### New Components

| Component | Purpose |
|-----------|---------|
| `ExportModal` | Template grid + live preview (`srcdoc` iframe) + PDF download |
| `CoverLetterExportModal` | Style selector + cover letter PDF download |
| `JobOutputEditor` | Section-by-section TipTap editor for `resumeJson`, same pattern as `ResumeEditPage` |

### Modified Components

| Component | Change |
|-----------|--------|
| `JobCreationModal` | Remove Resume step; merge into single AI Enhancement step; sequencing as described above |
| `JobDetailPage` — Resume & Cover Letter tab | Full redesign to read from `JobOutput` |

### Removed Components

| Component | Reason |
|-----------|--------|
| `TailorChangesPanel` | `tailorChanges` field no longer exists |

### Unchanged Components

| Component | Reason |
|-----------|--------|
| `ResumesPage` | Base resume management, unaffected |
| `SampleJobModal` | Already job-centric |
| Interview Prep tab | Unaffected |
| Notes & Timeline tab | Unaffected |

---

## Key Product Decisions

1. Templates are never stored on job outputs — chosen only at export time
2. One `JobOutput` per job — version counters track re-generations, not separate records
3. Manual edits to resume/cover letter do not count toward the 3-generation limit
4. Generation limits are now **independent**: 3 resume tailors AND 3 cover letter generations per job (previously 3 shared)
5. Exporting without AI tailoring renders the user's raw profile data with the chosen template — same PDF endpoint, server-side fallback
6. `ResumesPage` and base `Resume` records are untouched — separate profile export tool
7. `AiAmendment` table removed; independent version counters on `JobOutput` are the new mechanism
8. Fit analysis (`analyze-fit`) now scores profile-vs-job only — tailored resume content is no longer factored in
9. Jobs with a manually linked base resume (non-tailored `resumeId`) will lose that link on migration — this is a known trade-off; the count should be logged before migration runs
