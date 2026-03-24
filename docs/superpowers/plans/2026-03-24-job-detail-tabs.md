# Job Detail Tab Navigation + Status Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/jobs/:id` into a 4-tab layout (Job Info & Fit, Resume & Cover Letter, Interview Prep, Notes & Timeline) and add a per-job status change history with optional notes.

**Architecture:** URL-based tab navigation via `?tab=` query param. A new `JobStatusHistory` DB table records every status change atomically alongside the `PUT /api/jobs/:id` update. The Notes & Timeline tab renders both the existing overall notes textarea and a new `StatusTimeline` component.

**Tech Stack:** React 18 + React Router v7 + TypeScript + Tailwind CSS (client); Express + Prisma 5 + PostgreSQL (server); Zod (validation); Lucide React (icons).

**Note:** This project has no test suite — verification steps use `npm run dev` + browser checks.

---

## File Map

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `JobStatusHistory` model; add back-relation to `JobApplication` |
| `server/src/routes/jobs.ts` | Restructure `PUT /:id`; add `statusHistory` includes; add `PATCH`/`DELETE /:id/status-history/:historyId` |
| `client/src/types/index.ts` | Add `JobStatusHistory` interface; add optional `statusHistory` to `JobApplication` |
| `client/src/api/jobs.ts` | Add `updateStatusHistoryNote` and `deleteStatusHistoryEntry` API functions |
| `client/src/App.tsx` | Replace `/jobs/:id/prep` route with `<RedirectJobPrep />` |
| `client/src/components/jobs/StatusTimeline.tsx` | **New** — timeline list with inline note editing and delete confirmation |
| `client/src/pages/JobDetailPage.tsx` | Major refactor: tab bar, status in header, content split into 4 tabs, status-change note prompt |

---

## Task 1: Add `JobStatusHistory` to Prisma schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the new model and back-relation**

  In `server/prisma/schema.prisma`, add the `JobStatusHistory` model at the end of the `// ─── JOB APPLICATION ─────` section, after the `AiAmendment` model:

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

  Then add the back-relation field to the `JobApplication` model (after the `interviewPrep InterviewPrep?` line):

  ```prisma
  statusHistory JobStatusHistory[]
  ```

- [ ] **Step 2: Run migration**

  ```bash
  cd /Users/johnathanwong/Desktop/resume-app
  npm run db:migrate
  ```

  Expected: Prisma applies a migration adding the `JobStatusHistory` table. No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add server/prisma/schema.prisma server/prisma/migrations/
  git commit -m "feat: add JobStatusHistory schema"
  ```

---

## Task 2: Update `GET /:id` and restructure `PUT /:id` in jobs route

**Files:**
- Modify: `server/src/routes/jobs.ts`

- [ ] **Step 1: Update `GET /:id` to include `statusHistory`**

  Replace the existing `GET /:id` handler's include block:

  ```ts
  // Before:
  include: {
    resume: true,
    aiAmendments: { orderBy: { createdAt: 'desc' } },
  },

  // After:
  include: {
    resume: true,
    aiAmendments: { orderBy: { createdAt: 'desc' } },
    statusHistory: { orderBy: { createdAt: 'desc' } },
  },
  ```

- [ ] **Step 2: Restructure `PUT /:id`**

  Replace the entire `PUT /:id` handler (lines 72–89) with:

  ```ts
  router.put('/:id', validateBody(updateJobSchema), async (req, res, next) => {
    try {
      const userId = getUser(req).id;
      const id = req.params.id;

      // Ownership check + read current status before updating
      const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Job not found' });

      const isStatusChanging =
        req.body.status !== undefined && req.body.status !== existing.status;

      const updateData = {
        ...req.body,
        appliedAt: req.body.appliedAt ? new Date(req.body.appliedAt) : undefined,
        ...(req.body.status !== undefined ? { statusUpdatedAt: new Date() } : {}),
      };

      if (isStatusChanging) {
        // Atomic: update job + write history in one transaction
        await prisma.$transaction(async (tx) => {
          await tx.jobApplication.update({ where: { id }, data: updateData });
          await tx.jobStatusHistory.create({
            data: {
              jobId: id,
              fromStatus: existing.status,
              toStatus: req.body.status,
            },
          });
        });
      } else {
        await prisma.jobApplication.update({ where: { id }, data: updateData });
      }

      // Fetch final state with all includes
      const updated = await prisma.jobApplication.findFirst({
        where: { id, userId },
        include: {
          resume: true,
          aiAmendments: { orderBy: { createdAt: 'desc' } },
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });
      res.json(updated);
    } catch (err) { next(err); }
  });
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/routes/jobs.ts
  git commit -m "feat: include statusHistory in job responses and record on status change"
  ```

---

## Task 3: Add `PATCH` and `DELETE` status-history endpoints

**Files:**
- Modify: `server/src/routes/jobs.ts`

- [ ] **Step 1: Add Zod schema for note update**

  After the `updateJobSchema` definition (line 26), add:

  ```ts
  const updateHistoryNoteSchema = z.object({
    note: z.string().max(1000).nullable(),
  });
  ```

- [ ] **Step 2: Add `PATCH /:id/status-history/:historyId`**

  Add before `export default router`:

  ```ts
  router.patch('/:id/status-history/:historyId', validateBody(updateHistoryNoteSchema), async (req, res, next) => {
    try {
      const userId = getUser(req).id;
      const entry = await prisma.jobStatusHistory.findFirst({
        where: { id: req.params.historyId, job: { userId } },
      });
      if (!entry) return res.status(404).json({ error: 'Not found' });
      const updated = await prisma.jobStatusHistory.update({
        where: { id: entry.id },
        data: { note: req.body.note },
      });
      res.json(updated);
    } catch (err) { next(err); }
  });
  ```

- [ ] **Step 3: Add `DELETE /:id/status-history/:historyId`**

  ```ts
  router.delete('/:id/status-history/:historyId', async (req, res, next) => {
    try {
      const userId = getUser(req).id;
      const entry = await prisma.jobStatusHistory.findFirst({
        where: { id: req.params.historyId, job: { userId } },
      });
      if (!entry) return res.status(404).json({ error: 'Not found' });
      await prisma.jobStatusHistory.delete({ where: { id: entry.id } });
      res.status(204).send();
    } catch (err) { next(err); }
  });
  ```

- [ ] **Step 4: Verify server starts cleanly**

  ```bash
  npm run dev:server
  ```

  Expected: Server starts on port 3000, no TypeScript or runtime errors.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/routes/jobs.ts
  git commit -m "feat: add PATCH/DELETE status-history endpoints"
  ```

---

## Task 4: Add client types and API functions

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/jobs.ts`

- [ ] **Step 1: Add `JobStatusHistory` type to `client/src/types/index.ts`**

  After the `AiAmendment` interface (line 142), add:

  ```ts
  export interface JobStatusHistory {
    id: string;
    jobId: string;
    fromStatus: string;
    toStatus: string;
    note?: string | null;
    createdAt: string;
  }
  ```

  Then update the `JobApplication` interface — add `statusHistory` as an optional field after `aiAmendments`:

  ```ts
  statusHistory?: JobStatusHistory[];
  ```

- [ ] **Step 2: Add API functions to `client/src/api/jobs.ts`**

  Add after the `deleteJob` line:

  ```ts
  export const updateStatusHistoryNote = (jobId: string, historyId: string, note: string | null) =>
    api.patch(`/jobs/${jobId}/status-history/${historyId}`, { note }).then((r) => r.data);

  export const deleteStatusHistoryEntry = (jobId: string, historyId: string) =>
    api.delete(`/jobs/${jobId}/status-history/${historyId}`);
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/types/index.ts client/src/api/jobs.ts
  git commit -m "feat: add JobStatusHistory type and API functions"
  ```

---

## Task 5: Replace `/jobs/:id/prep` route with redirect

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add `RedirectJobPrep` component and swap the route**

  In `client/src/App.tsx`:

  1. Remove the `import { JobPrepPage }` line.
  2. Add an inline redirect component before the `App` function:

  ```tsx
  function RedirectJobPrep() {
    const { id } = useParams<{ id: string }>();
    return <Navigate to={`/jobs/${id}?tab=prep`} replace />;
  }
  ```

  3. Make sure `useParams` and `Navigate` are imported from `react-router-dom` (they already are).
  4. Replace:
  ```tsx
  <Route path="/jobs/:id/prep" element={<JobPrepPage />} />
  ```
  with:
  ```tsx
  <Route path="/jobs/:id/prep" element={<RedirectJobPrep />} />
  ```

- [ ] **Step 2: Verify redirect works**

  Start the client (`npm run dev:client`) and navigate to `/jobs/some-id/prep` — it should immediately redirect to `/jobs/some-id?tab=prep`.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/App.tsx
  git commit -m "feat: redirect /jobs/:id/prep to ?tab=prep"
  ```

---

## Task 6: Build `StatusTimeline` component

**Files:**
- Create: `client/src/components/jobs/StatusTimeline.tsx`

This component renders the chronological status change list with inline note editing, note-clearing, and delete-with-confirmation.

- [ ] **Step 1: Create the component**

  Create `client/src/components/jobs/StatusTimeline.tsx`:

  ```tsx
  import { useState, useEffect, useRef } from 'react';
  import { Pencil, Trash2, ArrowRight, Clock } from 'lucide-react';
  import { JobStatusHistory } from '../../types';
  import { updateStatusHistoryNote, deleteStatusHistoryEntry } from '../../api/jobs';
  import { Button } from '../ui/Button';
  import { Textarea } from '../ui/Textarea';

  interface Props {
    jobId: string;
    entries: JobStatusHistory[];
    onEntriesChange: (entries: JobStatusHistory[]) => void;
  }

  interface EntryRowProps {
    jobId: string;
    entry: JobStatusHistory;
    onUpdated: (updated: JobStatusHistory) => void;
    onDeleted: (id: string) => void;
  }

  function EntryRow({ jobId, entry, onUpdated, onDeleted }: EntryRowProps) {
    const [editingNote, setEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState(entry.note ?? '');
    const [savingNote, setSavingNote] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Sync local note value if parent entry changes
    useEffect(() => { setNoteValue(entry.note ?? ''); }, [entry.note]);

    const handleSaveNote = async () => {
      setSavingNote(true);
      try {
        const updated = await updateStatusHistoryNote(jobId, entry.id, noteValue.trim() || null);
        onUpdated({ ...entry, note: updated.note });
        setEditingNote(false);
      } finally { setSavingNote(false); }
    };

    const handleDelete = async () => {
      setDeleting(true);
      try {
        await deleteStatusHistoryEntry(jobId, entry.id);
        onDeleted(entry.id);
      } finally { setDeleting(false); }
    };

    const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });

    return (
      <div className="bg-white rounded-xl border shadow-sm p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">{entry.fromStatus}</span>
            <ArrowRight size={13} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900">{entry.toStatus}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              title="Edit note"
              onClick={() => { setEditingNote(true); setConfirmDelete(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <Pencil size={13} />
            </button>
            <button
              title="Delete entry"
              onClick={() => { setConfirmDelete(true); setEditingNote(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <Clock size={11} />
          {date} at {time}
        </div>

        {/* Existing note (read mode) */}
        {entry.note && !editingNote && (
          <p className="mt-2 text-xs text-gray-600 italic border-l-2 border-gray-200 pl-2">
            {entry.note}
          </p>
        )}

        {/* Note edit form */}
        {editingNote && (
          <div className="mt-3 space-y-2">
            <Textarea
              rows={3}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add a note about this change… (leave empty to clear)"
              onKeyDown={(e) => { if (e.key === 'Escape') { setEditingNote(false); setNoteValue(entry.note ?? ''); } }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNote} loading={savingNote}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditingNote(false); setNoteValue(entry.note ?? ''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-red-700 mb-2">Remove this status change from history?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDelete} loading={deleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                Confirm
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  export function StatusTimeline({ jobId, entries, onEntriesChange }: Props) {
    if (entries.length === 0) {
      return (
        <p className="text-xs text-gray-400 text-center py-6">
          No status changes recorded yet. Status changes will appear here.
        </p>
      );
    }

    const handleUpdated = (updated: JobStatusHistory) => {
      onEntriesChange(entries.map((e) => (e.id === updated.id ? updated : e)));
    };

    const handleDeleted = (id: string) => {
      onEntriesChange(entries.filter((e) => e.id !== id));
    };

    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            jobId={jobId}
            entry={entry}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/components/jobs/StatusTimeline.tsx
  git commit -m "feat: add StatusTimeline component"
  ```

---

## Task 7: Refactor `JobDetailPage` with tabs

**Files:**
- Modify: `client/src/pages/JobDetailPage.tsx`

This is the largest task. Replace the two-column grid layout with a tab bar, move Status to the header, split content into 4 tabs, and add the status-change note prompt.

- [ ] **Step 1: Replace the file contents**

  Replace `client/src/pages/JobDetailPage.tsx` with the following. Read the existing file first to confirm the complete list of imports and state already present — carry all of it forward, with additions noted below.

  ```tsx
  import { useEffect, useState, useRef } from 'react';
  import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
  import {
    ArrowLeft, Briefcase, Sparkles, FileText, ExternalLink, Pencil,
    MapPin, DollarSign, Copy, History, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Eye,
  } from 'lucide-react';
  import { getJob, updateJob } from '../api/jobs';
  import { getJobStatuses } from '../api/jobStatuses';
  import { streamCoverLetter, tailorResume } from '../api/ai';
  import { JobApplication, JobStatus, Resume, AiAmendment, FitAnalysis } from '../types';
  import { Button } from '../components/ui/Button';
  import { Input } from '../components/ui/Input';
  import { Textarea } from '../components/ui/Textarea';
  import { Select } from '../components/ui/Select';
  import { Modal } from '../components/ui/Modal';
  import { useAppStore } from '../store/useAppStore';
  import { TEMPLATE_OPTIONS } from '../api/templates';
  import { useTour } from '../hooks/useTour';
  import { TakeTourButton } from '../components/tour/TakeTourButton';
  import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';
  import { StatusTimeline } from '../components/jobs/StatusTimeline';

  const AI_AMENDMENT_LIMIT = 3;

  const TABS = [
    { id: 'info',   label: 'Job Info & Fit' },
    { id: 'resume', label: 'Resume & Cover Letter' },
    { id: 'prep',   label: 'Interview Prep' },
    { id: 'notes',  label: 'Notes & Timeline' },
  ] as const;
  type TabId = typeof TABS[number]['id'];

  export function JobDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToast } = useAppStore();

    const activeTab = (searchParams.get('tab') ?? 'info') as TabId;
    const setTab = (tab: TabId) => navigate(`?tab=${tab}`, { replace: true });

    const [job, setJob] = useState<JobApplication | null>(null);
    const [statuses, setStatuses] = useState<JobStatus[]>([]);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<JobApplication>>({});
    const [editSaving, setEditSaving] = useState(false);
    const [coverLetterOpen, setCoverLetterOpen] = useState(false);
    const [coverLetterPreviewOpen, setCoverLetterPreviewOpen] = useState(false);
    const [coverLetterPreviewText, setCoverLetterPreviewText] = useState<string | null>(null);
    const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
    const [tone, setTone] = useState('Professional');
    const [coverLetter, setCoverLetter] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [tailoring, setTailoring] = useState(false);
    const [tailorSourceId, setTailorSourceId] = useState('');
    const [notes, setNotes] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const abortRef = useRef<(() => void) | null>(null);

    // Status change note prompt state
    const [pendingHistoryId, setPendingHistoryId] = useState<string | null>(null);
    const [notePromptText, setNotePromptText] = useState('');
    const promptRef = useRef<HTMLDivElement | null>(null);

    useTour('job-detail');

    useEffect(() => {
      if (id) {
        getJob(id).then((j) => {
          setJob(j);
          setNotes(j.notes ?? '');
          const t = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          setCoverLetter((j.coverLetter ?? '').replace(/\[date\]/gi, t));
        }).catch(() => {});
        getJobStatuses().then(setStatuses).catch(() => {});
      }
    }, [id]);

    // Click-outside dismissal for note prompt
    useEffect(() => {
      if (!pendingHistoryId) return;
      const handler = (e: MouseEvent) => {
        if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
          setPendingHistoryId(null);
          setNotePromptText('');
        }
      };
      document.addEventListener('mousedown', handler, true);
      return () => document.removeEventListener('mousedown', handler, true);
    }, [pendingHistoryId]);

    const handleStatusChange = async (status: string) => {
      if (!job) return;
      const updated = await updateJob(job.id, { status });
      setJob(updated);
      addToast('Status updated', 'success');
      // Show note prompt for the newest history entry
      const newest = updated.statusHistory?.[0];
      if (newest) {
        setPendingHistoryId(newest.id);
        setNotePromptText('');
      }
    };

    const handleSavePromptNote = async () => {
      if (!job || !pendingHistoryId || !notePromptText.trim()) {
        setPendingHistoryId(null);
        setNotePromptText('');
        return;
      }
      const { updateStatusHistoryNote } = await import('../api/jobs');
      const updated = await updateStatusHistoryNote(job.id, pendingHistoryId, notePromptText.trim());
      setJob((j) => j ? {
        ...j,
        statusHistory: j.statusHistory?.map((e) => e.id === pendingHistoryId ? { ...e, note: updated.note } : e),
      } : j);
      setPendingHistoryId(null);
      setNotePromptText('');
    };

    const handleTailor = async () => {
      if (!job || !tailorSourceId || !job.description) return;
      setTailoring(true);
      try {
        await tailorResume(tailorSourceId, job.description, job.id);
        const updated = await getJob(job.id);
        setJob(updated);
        setTailorSourceId('');
        addToast('Resume tailored and linked to this job!', 'success');
      } catch (e: any) {
        addToast(e?.response?.data?.error ?? 'Tailoring failed', 'error');
      } finally { setTailoring(false); }
    };

    const handleSaveNotes = async () => {
      if (!job) return;
      await updateJob(job.id, { notes });
      addToast('Notes saved', 'success');
    };

    const openEdit = () => {
      if (!job) return;
      setEditForm({
        jobTitle: job.jobTitle,
        company: job.company,
        location: job.location ?? '',
        salary: job.salary ?? '',
        jobUrl: job.jobUrl ?? '',
        description: job.description ?? '',
      });
      setEditOpen(true);
    };

    const handleSaveEdit = async () => {
      if (!job) return;
      setEditSaving(true);
      try {
        const updated = await updateJob(job.id, {
          jobTitle: editForm.jobTitle,
          company: editForm.company,
          location: editForm.location || undefined,
          salary: editForm.salary || undefined,
          jobUrl: editForm.jobUrl || undefined,
          description: editForm.description || undefined,
        });
        setJob(updated);
        setEditOpen(false);
        addToast('Job updated', 'success');
      } catch { addToast('Failed to update job', 'error'); }
      finally { setEditSaving(false); }
    };

    const handleGenerateCoverLetter = () => {
      if (!job?.description) return addToast('Add a job description first', 'info');
      setCoverLetter('');
      setStreaming(true);
      let generated = '';
      const abort = streamCoverLetter(
        job.description,
        tone,
        (chunk) => { generated += chunk; setCoverLetter((prev) => prev + chunk); },
        async () => {
          setStreaming(false);
          const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          generated = generated.replace(/\[date\]/gi, today);
          setCoverLetter(generated);
          try {
            await updateJob(job.id, { coverLetter: generated });
            const refreshed = await getJob(job.id);
            setJob(refreshed);
            addToast('Cover letter saved', 'success');
          } catch { addToast('Failed to save cover letter', 'error'); }
        },
        () => { setStreaming(false); addToast('Cover letter generation failed', 'error'); },
        job.id
      );
      abortRef.current = abort;
    };

    if (!job) return <div className="text-center py-20 text-gray-400">Loading…</div>;

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const displayCoverLetter = job.coverLetter?.replace(/\[date\]/gi, today) ?? null;
    const amendmentCount = job.aiAmendments?.length ?? 0;
    const amendmentLimitReached = amendmentCount >= AI_AMENDMENT_LIMIT;

    return (
      <div className="max-w-3xl">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-4">
          <Link to="/jobs" className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft size={20} /></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{job.jobTitle}</h1>
            <p className="text-gray-600 text-sm font-medium">{job.company}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {job.location && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} /> {job.location}
                </span>
              )}
              {job.salary && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <DollarSign size={11} /> {job.salary}
                </span>
              )}
              {job.jobUrl && (
                <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink size={11} /> View posting
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TakeTourButton tourId="job-detail" />
            <Button variant="secondary" size="sm" onClick={openEdit}>
              <Pencil size={14} /> Edit
            </Button>
          </div>
        </div>

        {/* ── Status row (below title, above tabs) ── */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Status</span>
            <div className="w-48">
              <Select
                options={statuses.map((s) => ({ value: s.label, label: s.label }))}
                value={job.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              />
            </div>
          </div>
          {/* Note prompt (appears after status change) */}
          {pendingHistoryId && (
            <div ref={promptRef} className="mt-2 ml-[72px] p-3 bg-blue-50 border border-blue-100 rounded-xl max-w-sm">
              <p className="text-xs font-medium text-blue-800 mb-2">Add a note about this change?</p>
              <Textarea
                rows={2}
                value={notePromptText}
                onChange={(e) => setNotePromptText(e.target.value)}
                placeholder="e.g. Reached out to recruiter…"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setPendingHistoryId(null); setNotePromptText(''); }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSavePromptNote(); }
                }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSavePromptNote} disabled={!notePromptText.trim()}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => { setPendingHistoryId(null); setNotePromptText(''); }}>Skip</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Tab content ── */}

        {/* Job Info & Fit */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Job Description</h2>
              {job.description
                ? <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">{job.description}</pre>
                : <p className="text-xs text-gray-400">No description added. <button onClick={openEdit} className="text-blue-500 hover:underline">Add one</button></p>
              }
            </div>

            {job.fitAnalysis && (() => {
              const fa = job.fitAnalysis as FitAnalysis;
              const scoreColor = fa.score >= 70 ? 'text-green-700 bg-green-50 border-green-200' : fa.score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
              const scoreLabel = fa.score >= 70 ? 'Strong Match' : fa.score >= 40 ? 'Moderate Match' : 'Weak Match';
              return (
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-500" /> Fit Analysis
                  </h2>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 mb-4 ${scoreColor}`}>
                    <span className="text-2xl font-bold">{fa.score}%</span>
                    <span className="text-xs font-semibold">{scoreLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {fa.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                            <span className="flex-shrink-0 mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                        <AlertTriangle size={12} /> Gaps to Address
                      </p>
                      <ul className="space-y-1">
                        {fa.gaps.map((g, i) => (
                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                            <span className="flex-shrink-0 mt-0.5">•</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 italic border-l-2 border-gray-200 pl-3">{fa.summary}</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Resume & Cover Letter */}
        {activeTab === 'resume' && (
          <div className="space-y-4">
            {/* Resume panel */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Resume</h2>

              {job.resume?.tailoredFor && (
                <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                  <Sparkles size={13} className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">AI Tailored</span>
                    <p className="text-sm text-gray-800 font-medium truncate">{job.resume.title}</p>
                    <Link to={`/resumes/${job.resume.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                      <FileText size={11} /> View resume
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Sparkles size={10} /> AI amendments
                </span>
                <span className={`text-[10px] font-semibold ${amendmentLimitReached ? 'text-red-500' : amendmentCount === AI_AMENDMENT_LIMIT - 1 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {amendmentCount} / {AI_AMENDMENT_LIMIT}
                </span>
              </div>

              {job.description && (
                <div className="mt-2">
                  {amendmentLimitReached ? (
                    <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2.5 border border-red-100">
                      AI amendment limit reached for this job.
                    </p>
                  ) : (
                    <>
                      <Select
                        label={job.resume?.tailoredFor ? 'Re-tailor using template:' : 'Tailor resume for this job:'}
                        options={[{ value: '', label: '— Pick a template —' }, ...TEMPLATE_OPTIONS]}
                        value={tailorSourceId}
                        onChange={(e) => setTailorSourceId(e.target.value)}
                      />
                      <Button size="sm" className="mt-2 w-full" onClick={handleTailor} loading={tailoring} disabled={!tailorSourceId}>
                        <Sparkles size={13} />
                        {job.resume?.tailoredFor ? 'Re-tailor with AI' : 'Tailor with AI'}
                      </Button>
                      <p className="text-[10px] text-gray-400 mt-1">Creates a tailored copy from your profile data.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Amendment history */}
            {(job.aiAmendments?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setHistoryOpen((o) => !o)}
                >
                  <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <History size={14} className="text-gray-400" /> AI Amendment History
                    <span className="ml-1 text-[10px] font-normal text-gray-400">({job.aiAmendments!.length}/{AI_AMENDMENT_LIMIT})</span>
                  </h2>
                  {historyOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {historyOpen && (
                  <div className="mt-3 space-y-2">
                    {job.aiAmendments!.map((amendment, i) => (
                      <div key={amendment.id} className="rounded-lg border bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${amendment.type === 'RESUME_TAILOR' ? 'text-purple-600' : 'text-blue-600'}`}>
                            <Sparkles size={10} />
                            {amendment.type === 'RESUME_TAILOR' ? 'Resume Tailored' : 'Cover Letter'}
                            <span className="ml-1 font-normal text-gray-400">#{job.aiAmendments!.length - i}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(amendment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {amendment.type === 'RESUME_TAILOR' && amendment.resumeId && (
                          <Link to={`/resumes/${amendment.resumeId}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <FileText size={11} /> View tailored resume
                          </Link>
                        )}
                        {amendment.type === 'COVER_LETTER' && amendment.coverLetterText && (
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => { setCoverLetterPreviewText((amendment.coverLetterText ?? '').replace(/\[date\]/gi, today)); setCoverLetterPreviewOpen(true); }}
                          >
                            View cover letter
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cover letter */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-semibold text-gray-900 text-sm shrink-0">Cover Letter</h2>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {displayCoverLetter && (
                    <>
                      <button title="Preview" onClick={() => { setCoverLetterPreviewText(displayCoverLetter); setCoverLetterPreviewOpen(true); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700">
                        <Eye size={14} />
                      </button>
                      <button title="Copy" onClick={() => { navigator.clipboard.writeText(displayCoverLetter); addToast('Cover letter copied!', 'success'); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700">
                        <Copy size={14} />
                      </button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmRegenOpen(true)} disabled={amendmentLimitReached} loading={streaming}>
                        <Sparkles size={14} /> Regenerate
                      </Button>
                    </>
                  )}
                  {!displayCoverLetter && (
                    <Button variant="secondary" size="sm" onClick={() => setCoverLetterOpen(true)} disabled={amendmentLimitReached}>
                      <Sparkles size={14} /> Generate
                    </Button>
                  )}
                </div>
              </div>
              {displayCoverLetter ? (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">{displayCoverLetter}</pre>
              ) : (
                <p className="text-xs text-gray-400">No cover letter yet. Generate one with AI or write your own.</p>
              )}
            </div>
          </div>
        )}

        {/* Interview Prep */}
        {activeTab === 'prep' && (
          <InterviewPrepPanel jobId={job.id} hasDescription={!!job.description} />
        )}

        {/* Notes & Timeline */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 text-sm">Overall Notes</h2>
                <Button size="sm" variant="secondary" onClick={handleSaveNotes}>Save</Button>
              </div>
              <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview notes, contact info, follow-up reminders…" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Status History</h2>
              <StatusTimeline
                jobId={job.id}
                entries={job.statusHistory ?? []}
                onEntriesChange={(entries) => setJob((j) => j ? { ...j, statusHistory: entries } : j)}
              />
            </div>
          </div>
        )}

        {/* ── Modals (unchanged) ── */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Job" size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Job Title *" value={editForm.jobTitle ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))} />
              <Input label="Company *" value={editForm.company ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} />
              <Input label="Location" value={editForm.location ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
              <Input label="Salary / Range" value={editForm.salary ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))} />
            </div>
            <Input label="Job URL" value={editForm.jobUrl ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, jobUrl: e.target.value }))} placeholder="https://…" />
            <Textarea label="Job Description" rows={8} value={editForm.description ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={editSaving} disabled={!editForm.jobTitle?.trim() || !editForm.company?.trim()}>Save Changes</Button>
            </div>
          </div>
        </Modal>

        <Modal open={coverLetterPreviewOpen} onClose={() => setCoverLetterPreviewOpen(false)} title="Cover Letter Preview" size="xl">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[70vh] overflow-y-auto">{coverLetterPreviewText}</pre>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(coverLetterPreviewText!); addToast('Cover letter copied!', 'success'); }}>
              <Copy size={14} /> Copy
            </Button>
            <Button variant="secondary" onClick={() => setCoverLetterPreviewOpen(false)}>Close</Button>
          </div>
        </Modal>

        <Modal open={confirmRegenOpen} onClose={() => setConfirmRegenOpen(false)} title="Regenerate Cover Letter">
          <p className="text-sm text-gray-600 mb-5">This will replace your current cover letter. Are you sure?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmRegenOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmRegenOpen(false); handleGenerateCoverLetter(); }}>
              <Sparkles size={14} /> Regenerate
            </Button>
          </div>
        </Modal>

        <Modal open={coverLetterOpen} onClose={() => { abortRef.current?.(); setCoverLetterOpen(false); }} title="Cover Letter" size="xl">
          <div className="space-y-4">
            <Select
              label="Tone"
              options={['Professional', 'Conversational', 'Enthusiastic'].map((t) => ({ value: t, label: t }))}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
            <Button onClick={handleGenerateCoverLetter} loading={streaming} disabled={!job.description || amendmentLimitReached}>
              <Sparkles size={16} /> {coverLetter ? 'Regenerate' : 'Generate'} with AI
            </Button>
            {amendmentLimitReached && <p className="text-xs text-red-500">AI amendment limit reached for this job.</p>}
            <Textarea label="Cover Letter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={20} placeholder="Write or generate a cover letter…" />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setCoverLetterOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                const updated = await updateJob(job.id, { coverLetter: coverLetter || null });
                setJob(updated);
                setCoverLetterOpen(false);
                addToast('Cover letter saved', 'success');
              }} disabled={streaming}>Save</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify in browser**

  Run `npm run dev`, navigate to a job detail page. Check:
  - Tab bar renders with 4 tabs
  - Clicking tabs switches content without a page reload
  - URL updates to `?tab=X` on each click
  - Status dropdown appears in header row
  - Changing status shows the note prompt below the dropdown
  - Navigating to `/jobs/:id/prep` redirects to `?tab=prep`
  - Notes & Timeline tab shows notes textarea and StatusTimeline component
  - Changing status then navigating to Notes & Timeline shows the new history entry

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/JobDetailPage.tsx
  git commit -m "feat: refactor job detail page into 4-tab layout"
  ```

---

## Task 8: Final smoke check and cleanup

- [ ] **Step 1: TypeScript check**

  ```bash
  cd client && npx tsc --noEmit
  ```

  Expected: No errors.

- [ ] **Step 2: Full end-to-end walkthrough**

  With `npm run dev` running:
  1. Open a job → confirm Info tab is default
  2. Switch to each tab → correct content shown
  3. Change status → note prompt appears, save a note
  4. Navigate to Notes & Timeline tab → history entry with note visible
  5. Edit a note inline → save/cancel works
  6. Delete a history entry → confirmation shown, entry removed
  7. Visit `/jobs/:id/prep` directly → redirects to `?tab=prep`

- [ ] **Step 3: Final commit**

  ```bash
  git add -A
  git commit -m "feat: job detail tabs + status history complete"
  ```
