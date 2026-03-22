# Resume Tailoring V2 — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

Improve the AI resume tailoring feature with a sharper prompt, a better model, and a structured change-explanation system. Users will see a side-by-side diff of what changed between the previous tailored resume and the newly tailored one, with AI-generated reasons for every change at both the section level and per-bullet level.

---

## 1. AI Service — Prompt & Output Schema

### Model
**Provider confirmed:** `server/src/services/claude.ts` instantiates `new OpenAI({ apiKey: env.OPENAI_API_KEY })` with no `baseURL` override — this is the real OpenAI API. The hardcoded model `gpt-4o` is a real OpenAI model.

**Upgrade:** Change the model from `gpt-4o` to `gpt-4.1` in `tailorResume()`. `gpt-4.1` is available on OpenAI and follows complex structured schemas more reliably.

**Structured outputs:** Use `response_format: { type: 'json_schema', json_schema: { ... } }` (OpenAI structured outputs). Since this is OpenAI directly (not a shim), this is fully supported. As a fallback safety net, parse the output with Zod and throw a descriptive error on malformed output rather than letting a bad parse silently corrupt a resume.

### Prompt Redesign
The new prompt explicitly structures the AI's reasoning process:

1. Analyze the JD for key requirements, skills, and keywords before writing anything
2. Rewrite the summary directly targeting the role's core ask
3. For each experience entry, rewrite bullets to quantify impact and surface JD-relevant keywords — only where the candidate's actual experience supports it
4. Reorder and filter skills by JD relevance
5. Return a single structured JSON blob with both the tailored content and a `changes` changelog

### Output Schema

```ts
interface TailorResult {
  tailored: ResumeContent;
  changes: {
    overallSummary: string;        // AI-generated, e.g. "7 changes across summary and 3 experience entries to target this Senior Engineer role"
    summary: {
      sectionSummary: string;      // e.g. "Rewritten to emphasize leadership since the JD prioritizes it"
      original: string;
      rewritten: string;
    };
    experiences: Array<{
      index: number;               // 0-based index matching the experiences array — used as the join key (avoids company+title ambiguity)
      company: string;             // for display only
      title: string;               // for display only
      sectionSummary: string;      // e.g. "3 bullets reworded, 1 removed as not relevant to this role"
      bulletChanges: Array<{
        type: 'reworded' | 'added' | 'removed' | 'unchanged';
        original: string | null;   // null for 'added'
        rewritten: string | null;  // null for 'removed'
        reason: string;
      }>;
    }>;
    skills: {
      sectionSummary: string;      // e.g. "Reordered to surface React and Node.js, removed unrelated tools"
      skillChanges: Array<{
        type: 'added' | 'removed' | 'reordered' | 'unchanged';
        name: string;
        reason: string;
      }>;
    };
  };
}
```

---

## 2. Database & Server Route

### Prisma Schema
Add two nullable JSON columns to the `Resume` model:

```prisma
tailorChanges        Json?   // The changes changelog from the AI
tailorSourceSnapshot Json?   // Snapshot of the previous resume's contentJson (for diff rendering)
```

Both are nullable — existing resumes are unaffected. Applied via `prisma db push`.

### `tailorSourceSnapshot` Logic
Before calling the AI, check whether the job already has a linked resume (i.e. a previously tailored version):
- **If yes:** snapshot that resume's `contentJson` — this gives a "previous tailored → new tailored" diff (user-requested behavior for re-tailoring)
- **If no (first tailor):** snapshot the profile-derived `ResumeContent` (the same input we're sending to the AI) — this gives an "original profile → first tailored" diff

This snapshot is stored as `tailorSourceSnapshot` on the newly created clone.

### Route Changes (`POST /api/ai/tailor`)

1. Before the AI call, fetch and snapshot the source content (logic above)
2. Call the AI — destructure `{ tailored, changes }` from the response
3. Validate both with Zod; throw on malformed output
4. Create the clone with `contentJson: tailored`, `tailorChanges: changes`, `tailorSourceSnapshot: snapshot`
5. Return the full clone record including both new fields

### Resume GET Endpoint
Ensure `tailorChanges` and `tailorSourceSnapshot` are selected and returned in `GET /api/resumes/:id`.

---

## 3. Client — Tailored Resume Detail Page

### Location
`client/src/pages/ResumeDetailPage.tsx` — changes apply only when the resume has `tailoredFor` set (it is a tailored clone).

### Tab Navigation
Add a two-tab layout to the tailored resume detail page:
- **Preview** — existing resume preview, unchanged
- **Changes** — the diff + explanation view

**Graceful degradation:** If `tailorChanges` is null (e.g. resume was tailored before this feature shipped), the Changes tab is not rendered at all. The tab only appears when `tailorChanges` is present.

### Changes Tab Layout

**Header:**
The `changes.overallSummary` string displayed as a brief intro sentence.

**Section cards** (one per section — Summary, each Experience, Skills):

Each card contains:
1. **Section summary sentence** — `sectionSummary` from the changes object
2. **Side-by-side panel:**
   - Left column: previous version text (from `tailorSourceSnapshot`)
   - Right column: new version text (from `contentJson`)
   - Changed text highlighted with a background color
3. **Per-item change rows** beneath the panel:
   - Badge: `reworded` | `added` | `removed` (color-coded; `unchanged` items get no badge row)
   - Reason string from the item's `reason` field
   - **Unchanged bullets** are shown in the side-by-side panels (so the context reads naturally) but are not given a badge row in the change list below

### Data Source
All data comes from the existing `GET /api/resumes/:id` response — no new endpoints needed. `tailorChanges` and `tailorSourceSnapshot` are loaded once on page mount alongside the resume content.

---

## 4. Constraints & Non-Goals

- **No fabrication:** The prompt explicitly forbids inventing skills or experience not in the profile. Preserved from v1.
- **Amendment limit unchanged:** Still capped at 3 tailoring actions per job.
- **Cover letter, summary improvement, fit analysis, interview prep:** Unaffected.
- **No streaming:** The tailor endpoint remains a regular async call. The richer structured output makes streaming impractical without significant added complexity.

---

## 5. Success Criteria

1. The tailored resume is demonstrably better-targeted to the JD than the v1 output
2. Every changed section shows a clear, accurate reason at both section and per-item level
3. The side-by-side diff correctly reflects previous vs new content
4. The Changes tab only appears on tailored resumes that have `tailorChanges` data
5. Existing tailored resumes with no `tailorChanges` show only the Preview tab (no errors)
6. The Zod validation catches and surfaces malformed AI output as a clear error rather than silently corrupting a resume
