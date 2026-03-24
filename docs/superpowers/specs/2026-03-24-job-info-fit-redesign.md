# Job Info & Fit Tab Redesign

**Date:** 2026-03-24
**Status:** Approved

## Overview

Redesign the "Job Info & Fit" tab in `JobDetailPage` from a single-column layout into a structured 3-row layout that surfaces the fit analysis as a visual infographic and organises the role breakdown and job description clearly.

No backend changes are required. All data comes from existing fields: `job.fitAnalysis` (`score`, `strengths`, `gaps`, `summary`) and `job.description`.

---

## Layout

### Row 1 — Two columns

| Left (1fr) | Right (1.6fr) |
|---|---|
| Match Score donut chart | AI Summary card |

**Left — Match Score:**
- SVG donut/ring chart with the numeric score in the centre (e.g. `85%`)
- Label "Match Score" below the chart
- Tier label beneath that: "Strong Match" (≥70), "Moderate Match" (40–69), "Weak Match" (<40)
- Ring colour follows tier: green (≥70), amber (40–69), red (<40)
- Extracted into a standalone `FitScoreDonut` component

**Right — AI Summary:**
- Small "✦ AI Summary" label at the top in indigo
- Displays `fitAnalysis.summary` — the AI-generated fit narrative addressed to the user ("You are a strong match because…")

### Row 2 — Role Breakdown

Heading: "Role Breakdown"

Two equal columns side by side:

| Key Strengths (green) | Missing & Weak Points (red) |
|---|---|
| From `fitAnalysis.strengths[]` | From `fitAnalysis.gaps[]` |

- Each column is a card with a coloured border and header icon (✓ green / ▲ red)
- Items rendered as a bulleted list

### Row 3 — Job Description

- Card showing `job.description`
- Truncated to ~5 lines by default with a "Show full description ↓" toggle
- If no description: shows "No description added. Add one." link that opens the edit modal

### When `fitAnalysis` is null

Rows 1 and 2 are hidden. Only Row 3 (Job Description) is shown — identical to current behaviour.

---

## Components

### New: `client/src/components/jobs/FitScoreDonut.tsx`

**Props:**
```ts
interface FitScoreDonutProps {
  score: number; // 0–100
}
```

Renders an SVG ring chart. The filled arc uses `stroke-dasharray` calculated from the score. Colour and tier label are derived from score thresholds:
- ≥70 → green (`#16a34a`)
- 40–69 → amber (`#d97706`)
- <40 → red (`#dc2626`)

### Modified: `client/src/pages/JobDetailPage.tsx`

Replace the existing `activeTab === 'info'` JSX block with the new 3-row layout. Import `FitScoreDonut`.

---

## State

One new piece of local state in `JobDetailPage`:

```ts
const [descExpanded, setDescExpanded] = useState(false);
```

Controls the job description expand/collapse toggle.

---

## Files Changed

| File | Change |
|---|---|
| `client/src/components/jobs/FitScoreDonut.tsx` | Create new component |
| `client/src/pages/JobDetailPage.tsx` | Replace info tab JSX, import FitScoreDonut, add descExpanded state |

No changes to types, API, or server code.
