# Job Detail Tab Navigation + Status Timeline

**Date:** 2026-03-24
**Status:** Approved
**Scope:** `/jobs/:id` page — tab navigation refactor + Notes & Timeline tab with status history

---

## Overview

The job detail page currently renders all content in a single scrollable layout. This spec introduces a 4-tab navigation bar (URL-based via `?tab=` query param) to organise the page into focused sections, and adds a new status change timeline with per-entry notes and delete support.

---

## Tab Navigation

### Tabs

| Tab label | `?tab=` value | Content |
|---|---|---|
| Job Info & Fit | `info` | Job description, Fit analysis |
| Resume & Cover Letter | `resume` | Resume tailor, Cover letter, AI amendment history |
| Interview Prep | `prep` | `InterviewPrepPanel` (existing component) |
| Notes & Timeline | `notes` | Overall notes + Status change timeline |

### URL Behaviour

- No `?tab=` param defaults to `info`
- Tab switches call `navigate('?tab=X', { replace: true })` — no history pollution
- The existing `/jobs/:id/prep` route in `App.tsx` is replaced with a small `<RedirectJobPrep />` component that calls `useParams()` to read the `id`, then renders `<Navigate to={`/jobs/${id}?tab=prep`} replace />`. This ensures the dynamic `id` is correctly interpolated.

### Layout Changes

- A tab bar renders below the job title/header, above the content area
- The current two-column grid layout is removed
- The Status dropdown moves from the right sidebar column into the header row (next to the Edit button)
- Content previously in the right sidebar redistributes into the appropriate tabs (Resume & Cover Letter tab absorbs the resume panel, amendment history, and cover letter panel)

### Tour Attributes

The existing `data-tour` attributes (`job-status`, `job-resume`, `job-cover-letter`, `job-notes`, `interview-prep-link`) will be moved to their new locations within the tab layout. To prevent the auto-starting `useTour('job-detail')` hook from pointing at missing DOM elements in the interim, all `data-tour` attributes are removed from the page as part of this change. Updating the `job-detail` tour config and re-adding `data-tour` attributes is tracked as a follow-up.

### Tab Bar Style

- Horizontal row of tab labels
- Active tab: bold text + bottom border underline indicator (matches reference image)
- Inactive tabs: muted text, hover state
- No background fills or pill styles — clean underline-only design

---

## Notes & Timeline Tab

### Overall Notes

- Existing `<Textarea>` + Save button, unchanged
- Sits at the top of the tab

### Status Timeline

Chronological list of status changes for the job, newest first.

**Each entry displays:**
- `From Status → To Status` (arrow separator)
- Date and time of the change
- Note field (optional, editable with an explicit Save button — no save-on-blur)
- Delete button

**Adding a note at change time:**
When the user changes status via the header dropdown, a lightweight prompt appears below the status selector: "Add a note about this change?" with a text input and Skip / Save buttons.

The prompt renders inline in the DOM, directly below the status dropdown in the header. Dismissal rules:
- Clicking Skip, pressing Escape, or clicking anywhere outside the prompt (detected via a `mousedown` listener on `document` in the capture phase) closes it without saving a note
- Interacting with the status dropdown again while the prompt is open triggers a new `onChange` — the existing prompt is discarded (no note saved for the previous entry) and a new prompt appears for the latest change
- Navigating away while the prompt is open discards the unsaved note silently

**Adding/editing a note inline:**
- Each timeline entry has an "Add note" / edit pencil affordance
- Clicking reveals a textarea with explicit Save and Cancel buttons
- Clicking Cancel or pressing Escape discards changes without saving
- No save-on-blur

**Clearing a note:**
- When editing an existing note, clearing the textarea and clicking Save sends `null`, which clears the note on the entry

**Deleting an entry:**
- Trash icon on each timeline entry
- Inline confirmation text: "Remove this status change from history?" with Confirm / Cancel
- On confirm, the entry is deleted from the database and removed from local state

**Empty state:** "No status changes recorded yet. Status changes will appear here."

---

## Backend Changes

### Schema Changes

**New model: `JobStatusHistory`**

```prisma
model JobStatusHistory {
  id         String         @id @default(cuid())
  jobId      String
  job        JobApplication @relation(fields: [jobId], references: [id], onDelete: Cascade)
  fromStatus String
  toStatus   String
  note       String?
  createdAt  DateTime       @default(now())

  @@index([jobId])
}
```

No `updatedAt` field — intentional. History entries are logically append-only; the `note` field is the only mutable part and does not require change tracking.

**`JobApplication` model update:** Add the back-relation field `statusHistory JobStatusHistory[]` to the existing `JobApplication` model in `schema.prisma`. Without this, `include: { statusHistory: ... }` will not compile.

`fromStatus` is always non-nullable. The server reads the job's current `status` via a `findFirst` ownership check before updating. The only realistic failure mode is the job record not being found (deleted between requests), which results in a 404 — the history write does not run.

### API Changes

All changes are in `server/src/routes/jobs.ts`.

**Existing `PUT /:id` handler — required restructure:**

The current handler uses `prisma.jobApplication.updateMany` (ownership check) followed by `prisma.jobApplication.findUnique` (to return the updated record). This must be restructured to support reading `fromStatus` and writing history atomically:

1. `prisma.jobApplication.findFirst({ where: { id, userId } })` — ownership check + read current status. Return 404 if not found.
2. If `status` is in the request body and differs from the current value, use the **interactive transaction form** `prisma.$transaction(async (tx) => { await tx.jobApplication.update(...); await tx.jobStatusHistory.create(...); })` to update the job and write the history record atomically. (The array form of `$transaction` does not guarantee rollback on partial failure and must not be used here.)
3. If `status` is not changing (or not in the request body), update the job directly without a transaction.
4. After the update (with or without transaction), fetch the final state with a `prisma.jobApplication.findFirst({ where: { id, userId }, include: { resume: true, aiAmendments: { orderBy: { createdAt: 'desc' } }, statusHistory: { orderBy: { createdAt: 'desc' } } } })` and return it as the response.

If the transaction fails, return 500 — the status update does not persist.

**New endpoints:**
- `PATCH /api/jobs/:id/status-history/:historyId` — update `note` on a history entry. Body: `{ note: string | null }` (Zod: `z.object({ note: z.string().max(1000).nullable() })`). Sending `null` clears the note. Auth required. Ownership verified via: `prisma.jobStatusHistory.findFirst({ where: { id: historyId, job: { userId } } })` — the nested `where` filter ensures the record is both found and owned in a single query. Returns 404 if not found or not owned.
- `DELETE /api/jobs/:id/status-history/:historyId` — delete a history entry. Same ownership query: `prisma.jobStatusHistory.findFirst({ where: { id: historyId, job: { userId } } })`. Returns 204 on success, 404 if not found or not owned.

**`getJob` response:**
- Both the `GET /:id` handler and the `PUT /:id` response in `server/src/routes/jobs.ts` must add `statusHistory: { orderBy: { createdAt: 'desc' } }` to their `include` block.
- The `GET /` (list) endpoint is **not** updated — returning `statusHistory` on every job in the list is unnecessary. On the client, the `statusHistory` field on the `JobApplication` type must be marked optional (`statusHistory?: JobStatusHistory[]`) to avoid TypeScript errors on list results.

### Validation

- `note` on PATCH accepts `string` (max 1000 chars) or `null` (clears the note)
- Delete is permanent with no soft-delete

---

## Data Flow

1. User changes status via dropdown in header → `updateJob` API call → server reads current status, writes `JobStatusHistory` record in same transaction, returns updated job with `statusHistory` → note prompt appears below header dropdown
2. User saves note via prompt or inline edit → `PATCH /api/jobs/:id/status-history/:historyId` → entry updated in local state
3. User deletes entry → inline confirmation → `DELETE /api/jobs/:id/status-history/:historyId` → entry removed from local state

---

## Out of Scope

- Updating the `job-detail` onboarding tour to reflect new tab positions (follow-up — `data-tour` attributes removed in this change to prevent broken tour behaviour)
- Tracking AI amendment events in the timeline (cover letter generation, resume tailoring)
- "Job created" event in the timeline
- Status change notifications or reminders
- Timeline export
