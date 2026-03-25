# AI Transparency & Tailor Limit (Once Per Job)

**Date:** 2026-03-26
**Status:** Approved

## Overview

Restore AI transparency by persisting and displaying a "What AI Changed" panel after resume tailoring. Simultaneously reduce the tailoring limit from 3 to 1 per job, making the change set permanent and meaningful.

---

## Goals

1. Show users exactly what the AI rewrote when tailoring their resume.
2. Limit tailoring to one run per job — the panel reflects that single authoritative change set.
3. Keep the panel permanently visible on return visits (persistent, not ephemeral).

---

## Data Layer

### Schema change — `JobOutput`

Add one field to the existing `JobOutput` Prisma model (the `Resume` model already has `tailorChanges` as a pattern; this mirrors it on `JobOutput`):

```prisma
tailorChanges Json?
```

After editing the schema, run `npm run db:migrate` to apply.

Existing `JobOutput` rows without this field will have `null` — the panel simply won't render for those jobs.

### `TailorChanges` shape (already defined on server, needs to be mirrored on client)

The server's `tailorResume()` in `claude.ts` already validates and returns this structure via Zod — it is currently discarded. No AI prompt changes are needed.

```ts
interface SkillChange {
  type: 'added' | 'removed' | 'reordered' | 'unchanged';
  name: string;
  reason: string;
}

interface BulletChange {
  type: 'reworded' | 'added' | 'removed' | 'unchanged' | 'combined';
  original: string | null;
  rewritten: string | null;
  reason: string;
}

interface ExperienceChange {
  index: number;
  company: string;
  title: string;
  sectionSummary: string;
  bulletChanges: BulletChange[];
}

interface TailorChanges {
  overallSummary: string;
  summary: { sectionSummary: string; original: string; rewritten: string };
  experiences: ExperienceChange[];
  skills: { sectionSummary: string; skillChanges: SkillChange[] };
}
```

---

## Server Changes

### `server/src/routes/ai.ts` — tailor route

Two changes:

1. **Limit**: Change `currentVersion >= 3` → `currentVersion >= 1`. Error message: `"Resume tailoring is limited to once per job."`

2. **Persist changes**: The line `const { tailored } = await tailorResume(...)` currently discards `changes`. Destructure both and include `tailorChanges` in the upsert:

```ts
const { tailored, changes } = await tailorResume(profileContent, job.description);

// upsert create:
{ jobId, userId, resumeJson: tailored as any, tailorChanges: changes as any, resumeVersion: 1 }

// upsert update:
{ resumeJson: tailored as any, tailorChanges: changes as any, resumeVersion: { increment: 1 } }
```

---

## Client Changes

### `client/src/types/index.ts`

1. Add `SkillChange`, `BulletChange`, `ExperienceChange`, `TailorChanges` type definitions from the "Data Layer" section above.
2. Add `tailorChanges: TailorChanges | null` to the existing `JobOutput` interface.

### `client/src/pages/JobDetailPage.tsx` — limit references

There are **four** hardcoded references to the old limit that all need updating (search by string, not line number):

| Search for | Replace with |
|------------|-------------|
| `addToast('Tailor limit reached (3/3)', 'error')` | `addToast('Resume tailoring is limited to once per job.', 'error')` |
| `Version {jobOutput.resumeVersion} / 3` (resume section only) | `Version {jobOutput.resumeVersion} / 1` |
| `disabled={jobOutput.resumeVersion >= 3}` | `disabled={jobOutput.resumeVersion >= 1}` |
| `jobOutput.resumeVersion >= 3 ? 'Tailor limit reached' : 'Re-tailor'` | `jobOutput.resumeVersion >= 1 ? 'Tailor limit reached' : 'Re-tailor'` |

Note: the cover letter section has its own `>= 3` checks — leave those unchanged.

### `client/src/pages/JobDetailPage.tsx` — tooltip on disabled Re-tailor button

No existing tooltip component exists in `client/src/components/ui/`. Use a simple wrapper `<div>` with `title` attribute (native browser tooltip) around the disabled `<Button>`:

```tsx
<div title={jobOutput.resumeVersion >= 1 ? 'Each job can only be tailored once' : undefined}>
  <Button ... disabled={jobOutput.resumeVersion >= 1}>
    ...
  </Button>
</div>
```

### `client/src/pages/JobDetailPage.tsx` — auto-expand state

Add local state to control whether the changes panel opens expanded after a fresh tailor:

```ts
const [tailorPanelExpanded, setTailorPanelExpanded] = useState(false);
```

In `handleTailor`'s success path, after `setJobOutput(updated)`, add:

```ts
setTailorPanelExpanded(true);
```

### `client/src/pages/JobDetailPage.tsx` — render `TailorChangesPanel`

The resume section contains a `<JobOutputEditor ... />` self-closing tag. Insert `<TailorChangesPanel>` immediately after it (still inside the same `<div>` wrapper):

```tsx
<JobOutputEditor ... />
{jobOutput.tailorChanges && (
  <TailorChangesPanel
    changes={jobOutput.tailorChanges}
    initiallyExpanded={tailorPanelExpanded}
    onCollapse={() => setTailorPanelExpanded(false)}
  />
)}
```

### New component — `client/src/components/jobs/TailorChangesPanel.tsx`

Props:

```ts
interface Props {
  changes: TailorChanges;
  initiallyExpanded: boolean;
  onCollapse: () => void;
}
```

**Structure:**

```
┌─ What AI Changed ────────────────────────── [chevron] ─┐
│  Overall: "Tailored for Senior Frontend Engineer at …"  │
│                                                         │
│  ▸ Summary                                              │
│    Before: [original text]                              │
│    After:  [rewritten text]                             │
│    Why:    [sectionSummary]                             │
│                                                         │
│  ▸ Acme Corp — Software Engineer                        │
│    [sectionSummary]                                     │
│    • reworded  "Led team…" → "Directed cross-functional…"│
│                Reason: JD requires leadership signals   │
│    • added     "Reduced load time by 40%…"              │
│                Reason: JD emphasizes performance        │
│    • removed   "Attended weekly standups"               │
│                Reason: Low signal, no JD relevance      │
│                                                         │
│  ▸ Skills                                               │
│    [sectionSummary]                                     │
│    • reordered  React — JD lists React as primary req.  │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**

- Uses local `useState` for open/closed. Initialise from `initiallyExpanded` prop.
- When user manually collapses, call `onCollapse()` so parent clears `tailorPanelExpanded` — prevents re-expanding on re-render.
- Color-coded type badges: `reworded` → blue, `added` → green, `removed` → red/muted, `combined` → gray.
- Bullet changes with `type: 'unchanged'` are hidden to reduce noise.
- Experience entries with no non-unchanged bullets are also hidden.

---

## Files Changed

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `tailorChanges Json?` to `JobOutput` |
| `server/src/routes/ai.ts` | Limit 3→1, persist `changes` in upsert |
| `client/src/types/index.ts` | Add `TailorChanges` types, update `JobOutput` |
| `client/src/pages/JobDetailPage.tsx` | 4 limit strings updated, tooltip wrapper, panel render, expand state |
| `client/src/components/jobs/TailorChangesPanel.tsx` | New collapsible panel component |

---

## Out of Scope

- No changes to cover letter limit (stays at 3).
- No changes to the AI prompt or `tailorResume()` service function.
- No retroactive back-fill of `tailorChanges` for existing tailored resumes.
