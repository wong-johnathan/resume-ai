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

- One `JobOutput` per job (created alongside the job, fields nullable until AI generates content)
- `resumeVersion` and `coverLetterVersion` increment on each AI generation (max 3 each)
- Manual inline edits do NOT increment version counters

### `JobApplication` changes

- Remove `resumeId` foreign key (no longer links to `Resume` table)
- Remove `coverLetter` field (moves to `JobOutput.coverLetterText`)

### `Resume` table

- Unchanged for base resumes (ResumesPage)
- Existing tailored resumes (`tailoredFor` is set) are migrated to `JobOutput` and then deleted
- `templateId` is never stored on job outputs — passed at export time only

### Removed: `AiAmendment` table

Replaced by version counters on `JobOutput`. Amendment history is no longer tracked per-record; version counts enforce the 3-generation limit.

### Migration Plan

1. Create `JobOutput` table
2. For each `JobApplication` with a linked `resumeId` where `Resume.tailoredFor` is set:
   - Copy `Resume.contentJson` → `JobOutput.resumeJson`
   - Set `resumeVersion = 1`
3. For each `JobApplication` with `coverLetter` set:
   - Copy `coverLetter` → `JobOutput.coverLetterText`
   - Set `coverLetterVersion = 1`
4. Remove `resumeId` from `JobApplication`
5. Delete tailored `Resume` records (where `tailoredFor` is not null)
6. Drop `AiAmendment` table

---

## API Layer

### New Routes

```
GET  /api/jobs/:id/output
  Returns JobOutput (resumeJson, coverLetterText, resumeVersion, coverLetterVersion)

POST /api/ai/tailor
  Body: { jobId }
  Reads profile + job description → generates tailored content
  Upserts JobOutput.resumeJson, increments resumeVersion
  Returns 403 if resumeVersion >= 3

POST /api/ai/cover-letter
  Body: { jobId, tone }
  SSE stream (behavior unchanged)
  On complete: upserts JobOutput.coverLetterText, increments coverLetterVersion
  Returns 403 if coverLetterVersion >= 3

GET  /api/jobs/:id/resume/pdf?templateId=xxx
  Reads JobOutput.resumeJson (falls back to profile data if null)
  Renders HTML with chosen template → returns PDF via Puppeteer

GET  /api/jobs/:id/resume/preview?templateId=xxx
  Same as above but returns HTML (for live preview in export modal)

GET  /api/jobs/:id/cover-letter/pdf
  Renders JobOutput.coverLetterText as PDF

PATCH /api/jobs/:id/output
  Body: { resumeJson?, coverLetterText? }
  Saves inline edits — does NOT increment version counters
```

### Removed Routes

- `PUT /api/jobs/:id/resume` — linking a Resume to a job is no longer needed
- AI tailor no longer creates `Resume` records

### Unchanged

- All `/api/resumes` routes (serve ResumesPage base resumes)
- `/api/ai/analyze-fit`, interview prep, sample job routes
- SSE streaming behavior for cover letter

---

## UI & Components

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
- Output exists: Inline rich-text editor (`JobOutputEditor`) for `resumeJson` content
  - "Re-tailor" button (disabled when `resumeVersion >= 3`)
  - Version badge: e.g., "Version 2 / 3"
  - "Download Resume" → opens `ExportModal`

**Cover Letter Section**

- No output: "Generate Cover Letter" button with inline tone selector
- Output exists: Editable textarea
  - "Regenerate" button (disabled when `coverLetterVersion >= 3`)
  - "Download Cover Letter" → opens `CoverLetterExportModal`

### New Components

| Component | Purpose |
|-----------|---------|
| `ExportModal` | Template grid selector + live preview iframe + "Download PDF" button |
| `CoverLetterExportModal` | Style selector + "Download PDF" button |
| `JobOutputEditor` | Inline rich-text editor for tailored `resumeJson` content |

### Modified Components

| Component | Change |
|-----------|--------|
| `JobCreationModal` | Remove Resume step; merge into single AI Enhancement step |
| `JobDetailPage` — Resume & Cover Letter tab | Full redesign to read from `JobOutput` |

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
2. One `JobOutput` per job — no multi-version resume history (version counter tracks re-generations, not separate records)
3. Manual edits to resume/cover letter do not count toward the 3-generation limit
4. Exporting without AI tailoring renders the user's raw profile data with the chosen template
5. `ResumesPage` and base `Resume` records are untouched — they remain a separate profile export tool
6. `AiAmendment` table is removed; version counters on `JobOutput` are the new limit mechanism
