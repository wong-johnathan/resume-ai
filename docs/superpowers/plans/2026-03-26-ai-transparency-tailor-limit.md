# AI Transparency & Tailor Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the AI's change log when tailoring a resume, display it in a collapsible "What AI Changed" panel on the job detail page, and limit tailoring to once per job.

**Architecture:** Add `tailorChanges Json?` to the `JobOutput` Prisma model; save the `changes` object the server already generates (currently discarded) alongside the tailored resume; add `TailorChanges` types to the client; build a `TailorChangesPanel` component; wire it into `JobDetailPage` with expand-on-tailor behavior and a tooltip on the now-permanently-disabled re-tailor button.

**Tech Stack:** Prisma 5 (schema + migration), Express (route update), TypeScript (shared types), React 18 + Tailwind CSS (new component + page integration)

**Spec:** `docs/superpowers/specs/2026-03-26-ai-transparency-tailor-limit-design.md`

> **Note:** This project has no test suite. Verification steps are manual — start the dev server (`npm run dev`) and exercise the feature in the browser.

---

## File Map

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Modify — add `tailorChanges Json?` to `JobOutput` |
| `server/src/routes/ai.ts` | Modify — limit 3→1, persist `changes` in upsert |
| `client/src/types/index.ts` | Modify — add `TailorChanges` types, update `JobOutput` |
| `client/src/components/jobs/TailorChangesPanel.tsx` | Create — collapsible AI changes panel |
| `client/src/pages/JobDetailPage.tsx` | Modify — limit refs, tooltip, expand state, render panel |

---

### Task 1: Add `tailorChanges` to `JobOutput` schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the field**

In `server/prisma/schema.prisma`, find the `JobOutput` model (starts with `model JobOutput {`) and add `tailorChanges Json?` after the `resumeVersion` line:

```prisma
model JobOutput {
  id                   String   @id @default(cuid())
  jobId                String   @unique
  userId               String
  resumeJson           Json?
  coverLetterText      String?  @db.Text
  resumeVersion        Int      @default(0)
  coverLetterVersion   Int      @default(0)
  tailorChanges        Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  job  JobApplication @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Push schema to the database**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run db:migrate
```

Expected: Prisma applies the migration (adds nullable column — no data loss). The command should exit cleanly with no errors.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add tailorChanges field to JobOutput schema"
```

---

### Task 2: Server — persist changes and enforce limit of 1

**Files:**
- Modify: `server/src/routes/ai.ts`

- [ ] **Step 1: Update the limit check**

Find the line:
```ts
if (currentVersion >= 3) {
  return res.status(403).json({ error: 'Resume tailor limit of 3 reached for this job.' });
}
```

Replace with:
```ts
if (currentVersion >= 1) {
  return res.status(403).json({ error: 'Resume tailoring is limited to once per job.' });
}
```

- [ ] **Step 2: Destructure `changes` from the AI call**

Find these two lines (the comment + destructure):
```ts
    // AI call — only need tailored content, not changes
    const { tailored } = await tailorResume(profileContent, job.description);
```

Replace with:
```ts
    // AI call — destructure both tailored content and changes
    const { tailored, changes } = await tailorResume(profileContent, job.description);
```

- [ ] **Step 3: Persist `tailorChanges` in the upsert**

Find the upsert block:
```ts
const updated = await prisma.jobOutput.upsert({
  where: { jobId },
  create: { jobId, userId, resumeJson: tailored as any, resumeVersion: 1 },
  update: { resumeJson: tailored as any, resumeVersion: { increment: 1 } },
});
```

Replace with:
```ts
const updated = await prisma.jobOutput.upsert({
  where: { jobId },
  create: { jobId, userId, resumeJson: tailored as any, tailorChanges: changes as any, resumeVersion: 1 },
  update: { resumeJson: tailored as any, tailorChanges: changes as any, resumeVersion: { increment: 1 } },
});
```

- [ ] **Step 4: Verify the server compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ai.ts
git commit -m "feat: limit resume tailoring to once per job and persist tailorChanges"
```

---

### Task 3: Client types — add `TailorChanges` and update `JobOutput`

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Add the type definitions**

Open `client/src/types/index.ts`. Find the `JobOutput` interface:
```ts
export interface JobOutput {
  id: string;
  jobId: string;
  resumeJson: ResumeContent | null;
  coverLetterText: string | null;
  resumeVersion: number;
  coverLetterVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Insert the following **before** the `JobOutput` interface:

```ts
export interface SkillChange {
  type: 'added' | 'removed' | 'reordered' | 'unchanged';
  name: string;
  reason: string;
}

export interface BulletChange {
  type: 'reworded' | 'added' | 'removed' | 'unchanged' | 'combined';
  original: string | null;
  rewritten: string | null;
  reason: string;
}

export interface ExperienceChange {
  index: number;
  company: string;
  title: string;
  sectionSummary: string;
  bulletChanges: BulletChange[];
}

export interface TailorChanges {
  overallSummary: string;
  summary: {
    sectionSummary: string;
    original: string;
    rewritten: string;
  };
  experiences: ExperienceChange[];
  skills: {
    sectionSummary: string;
    skillChanges: SkillChange[];
  };
}
```

- [ ] **Step 2: Add `tailorChanges` to `JobOutput`**

Add `tailorChanges: TailorChanges | null;` to the `JobOutput` interface:

```ts
export interface JobOutput {
  id: string;
  jobId: string;
  resumeJson: ResumeContent | null;
  coverLetterText: string | null;
  resumeVersion: number;
  coverLetterVersion: number;
  tailorChanges: TailorChanges | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify client compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add TailorChanges types and tailorChanges to JobOutput client type"
```

---

### Task 4: Build `TailorChangesPanel` component

**Files:**
- Create: `client/src/components/jobs/TailorChangesPanel.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/jobs/TailorChangesPanel.tsx` with the following content:

```tsx
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TailorChanges, BulletChange } from '../../types';

interface Props {
  changes: TailorChanges;
  initiallyExpanded: boolean;
  onCollapse: () => void;
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  reworded: { label: 'reworded', className: 'bg-blue-100 text-blue-700' },
  added:    { label: 'added',    className: 'bg-green-100 text-green-700' },
  removed:  { label: 'removed',  className: 'bg-red-100 text-red-600' },
  combined: { label: 'combined', className: 'bg-gray-100 text-gray-600' },
};

function BulletChangeRow({ change }: { change: BulletChange }) {
  const badge = TYPE_BADGE[change.type];
  if (!badge) return null; // hide 'unchanged'

  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className} flex-shrink-0`}>
          {badge.label}
        </span>
        {change.original && (
          <span className="text-xs text-gray-400 line-through truncate">{change.original}</span>
        )}
      </div>
      {change.rewritten && (
        <p className="text-xs text-gray-700 pl-[52px]">{change.rewritten}</p>
      )}
      <p className="text-[10px] text-gray-400 pl-[52px] italic">{change.reason}</p>
    </div>
  );
}

export function TailorChangesPanel({ changes, initiallyExpanded, onCollapse }: Props) {
  const [open, setOpen] = useState(initiallyExpanded);

  useEffect(() => {
    if (initiallyExpanded) setOpen(true);
  }, [initiallyExpanded]);

  const handleToggle = () => {
    if (open) onCollapse();
    setOpen((v) => !v);
  };

  const visibleExperiences = changes.experiences.filter((exp) =>
    exp.bulletChanges.some((b) => b.type !== 'unchanged')
  );

  const visibleSkillChanges = changes.skills.skillChanges.filter(
    (s) => s.type !== 'unchanged'
  );

  return (
    <div className="border border-indigo-100 rounded-xl bg-indigo-50/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-50 transition-colors"
      >
        <div>
          <p className="text-xs font-semibold text-indigo-700">What AI Changed</p>
          {!open && (
            <p className="text-[10px] text-indigo-400 mt-0.5 truncate max-w-xs">
              {changes.overallSummary}
            </p>
          )}
        </div>
        {open ? (
          <ChevronUp size={14} className="text-indigo-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-indigo-400 flex-shrink-0" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Overall summary */}
          <p className="text-xs text-indigo-600 italic">{changes.overallSummary}</p>

          {/* Summary section */}
          {changes.summary.original !== changes.summary.rewritten && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{changes.summary.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2 space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold text-red-500 uppercase">Before</span>
                  <p className="text-xs text-gray-500 line-through mt-0.5">{changes.summary.original}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-green-600 uppercase">After</span>
                  <p className="text-xs text-gray-700 mt-0.5">{changes.summary.rewritten}</p>
                </div>
              </div>
            </div>
          )}

          {/* Experience sections */}
          {visibleExperiences.map((exp) => (
            <div key={exp.index}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                {exp.company} — {exp.title}
              </p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{exp.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2">
                {exp.bulletChanges
                  .filter((b) => b.type !== 'unchanged')
                  .map((b, i) => (
                    <BulletChangeRow key={i} change={b} />
                  ))}
              </div>
            </div>
          ))}

          {/* Skills section */}
          {visibleSkillChanges.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Skills</p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{changes.skills.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2 space-y-1">
                {visibleSkillChanges.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      s.type === 'added' ? 'bg-green-100 text-green-700' :
                      s.type === 'removed' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {s.type}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-gray-700">{s.name}</span>
                      <span className="text-[10px] text-gray-400 ml-1">— {s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify client compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/jobs/TailorChangesPanel.tsx
git commit -m "feat: add TailorChangesPanel component"
```

---

### Task 5: Wire `TailorChangesPanel` into `JobDetailPage`

**Files:**
- Modify: `client/src/pages/JobDetailPage.tsx`

- [ ] **Step 1: Add import for `TailorChangesPanel`**

Find the existing import block at the top of the file. After the `JobOutputEditor` import line:
```ts
import { JobOutputEditor } from '../components/jobs/JobOutputEditor';
```

Add:
```ts
import { TailorChangesPanel } from '../components/jobs/TailorChangesPanel';
```

- [ ] **Step 2: Add expand state**

Find the block of `useState` declarations in the "Resume & Cover Letter tab state" section (near `const [tailoring, setTailoring] = useState(false);`). Add after it:
```ts
const [tailorPanelExpanded, setTailorPanelExpanded] = useState(false);
```

- [ ] **Step 3: Set expand state on successful tailor**

Find `handleTailor`'s success path:
```ts
const updated = await tailorResume(job.id);
setJobOutput(updated);
addToast('Resume tailored successfully!', 'success');
```

Replace with:
```ts
const updated = await tailorResume(job.id);
setJobOutput(updated);
setTailorPanelExpanded(true);
addToast('Resume tailored successfully!', 'success');
```

- [ ] **Step 4: Update the 403 toast message**

Find:
```ts
addToast('Tailor limit reached (3/3)', 'error');
```

Replace with:
```ts
addToast('Resume tailoring is limited to once per job.', 'error');
```

- [ ] **Step 5: Update `Version X / 3` display**

Find (in the resume section header, not the cover letter section):
```tsx
<span className="text-xs text-gray-400">Version {jobOutput.resumeVersion} / 3</span>
```

Replace with:
```tsx
<span className="text-xs text-gray-400">Version {jobOutput.resumeVersion} / 1</span>
```

- [ ] **Step 6: Update the disabled check and label on Re-tailor button**

Find:
```tsx
disabled={jobOutput.resumeVersion >= 3}
```

Replace with:
```tsx
disabled={jobOutput.resumeVersion >= 1}
```

Find:
```tsx
<Sparkles size={13} /> {jobOutput.resumeVersion >= 3 ? 'Tailor limit reached' : 'Re-tailor'}
```

Replace with:
```tsx
<Sparkles size={13} /> {jobOutput.resumeVersion >= 1 ? 'Tailor limit reached' : 'Re-tailor'}
```

- [ ] **Step 7: Wrap Re-tailor button in tooltip div**

Find the entire `<Button>` block for Re-tailor (the one with `onClick={handleTailor}` inside the `jobOutput.resumeJson` truthy branch):
```tsx
<div className="flex gap-2">
  <Button
    variant="secondary"
    size="sm"
    onClick={handleTailor}
    loading={tailoring}
    disabled={jobOutput.resumeVersion >= 1}
  >
    <Sparkles size={13} /> {jobOutput.resumeVersion >= 1 ? 'Tailor limit reached' : 'Re-tailor'}
  </Button>
</div>
```

Replace with:
```tsx
<div className="flex gap-2">
  <div title={jobOutput.resumeVersion >= 1 ? 'Each job can only be tailored once' : undefined}>
    <Button
      variant="secondary"
      size="sm"
      onClick={handleTailor}
      loading={tailoring}
      disabled={jobOutput.resumeVersion >= 1}
    >
      <Sparkles size={13} /> {jobOutput.resumeVersion >= 1 ? 'Tailor limit reached' : 'Re-tailor'}
    </Button>
  </div>
</div>
```

- [ ] **Step 8: Render `TailorChangesPanel` after `JobOutputEditor`**

Find `<JobOutputEditor` (the self-closing tag inside the `jobOutput.resumeJson` truthy branch) and the `</div>` that immediately follows it:
```tsx
                <JobOutputEditor
                  jobId={job.id}
                  resumeJson={jobOutput.resumeJson}
                  onSaved={(updated) => setJobOutput((o) => o ? { ...o, resumeJson: updated } : o)}
                />
              </div>
```

Replace with:
```tsx
                <JobOutputEditor
                  jobId={job.id}
                  resumeJson={jobOutput.resumeJson}
                  onSaved={(updated) => setJobOutput((o) => o ? { ...o, resumeJson: updated } : o)}
                />
                {jobOutput.tailorChanges && (
                  <TailorChangesPanel
                    changes={jobOutput.tailorChanges}
                    initiallyExpanded={tailorPanelExpanded}
                    onCollapse={() => setTailorPanelExpanded(false)}
                  />
                )}
              </div>
```

- [ ] **Step 9: Verify the full build**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 10: Smoke test in the browser**

Start the dev server:
```bash
npm run dev
```

Open a job that has no tailored resume yet:
1. Click "Generate Tailored Resume" — should succeed once.
2. The "What AI Changed" panel should appear below the editor, expanded.
3. Collapse it manually — it should stay collapsed.
4. Reload the page — the panel should still be there (collapsed).
5. The Re-tailor button should now show "Tailor limit reached" and be disabled.
6. Hover over it — browser native tooltip should show "Each job can only be tailored once".
7. `Version 1 / 1` should appear in the header.

- [ ] **Step 11: Commit**

```bash
git add client/src/pages/JobDetailPage.tsx
git commit -m "feat: integrate TailorChangesPanel into JobDetailPage with once-per-job limit"
```
