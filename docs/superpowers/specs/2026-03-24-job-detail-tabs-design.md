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
- The existing `/jobs/:id/prep` route is kept and redirects to `/jobs/:id?tab=prep` for backward compatibility

### Layout Changes

- A tab bar renders below the job title/header, above the content area
- The current two-column grid layout is removed
- The Status dropdown moves from the right sidebar column into the header row (next to the Edit button)
- Content previously in the right sidebar redistributes into the appropriate tabs (Resume & Cover Letter tab absorbs the resume panel, amendment history, and cover letter panel)

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
- Note field (optional, editable inline)
- Delete button

**Adding a note:**
- Inline: each entry has an "Add note" / edit pencil affordance; clicking reveals a textarea that saves on blur or explicit Save button
- At change time: when the user changes status anywhere on the page, a lightweight prompt appears below the status selector — "Add a note about this change?" with a text input and Skip / Save options. Submitting Save (or pressing Enter) saves the note; Skip dismisses without a note.

**Deleting an entry:**
- Trash icon on each timeline entry
- Confirmation prompt inline or as a small modal: "Remove this status change from history?"
- On confirm, the entry is deleted from the database

**Empty state:** "No status changes recorded yet. Status changes will appear here."

---

## Backend Changes

### New Database Table: `JobStatusHistory`

```prisma
model JobStatusHistory {
  id         String   @id @default(cuid())
  jobId      String
  job        JobApplication @relation(fields: [jobId], references: [id], onDelete: Cascade)
  fromStatus String
  toStatus   String
  note       String?
  createdAt  DateTime @default(now())
}
```

### API Changes

**Existing endpoint modified:**
- `PATCH /api/jobs/:id` (status update) — when `status` field changes, write a `JobStatusHistory` record with `fromStatus` = current status, `toStatus` = new status

**New endpoints:**
- `PATCH /api/jobs/:id/status-history/:historyId` — update `note` on a history entry (auth required, job must belong to user)
- `DELETE /api/jobs/:id/status-history/:historyId` — delete a history entry (auth required, job must belong to user)

**`getJob` response:**
- Include `statusHistory` array (ordered by `createdAt` desc) on the job object

### Validation

- `note` on PATCH is a nullable string, max 1000 characters
- Delete is permanent with no soft-delete

---

## Data Flow

1. User changes status via dropdown in header → `updateJob` API call → server writes `JobStatusHistory` record → client receives updated job (including new `statusHistory` entry) → note prompt appears
2. User adds note via prompt or inline edit → `PATCH /api/jobs/:id/status-history/:historyId` → optimistic update in UI
3. User deletes entry → confirmation → `DELETE /api/jobs/:id/status-history/:historyId` → entry removed from local state

---

## Out of Scope

- Tracking AI amendment events in the timeline (cover letter generation, resume tailoring)
- "Job created" event in the timeline
- Status change notifications or reminders
- Timeline export
