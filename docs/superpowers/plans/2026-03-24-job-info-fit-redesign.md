# Job Info & Fit Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Job Info & Fit tab into a 3-row layout: match score donut + AI summary, role breakdown (strengths/gaps), and collapsible job description.

**Architecture:** Extract a `FitScoreDonut` SVG component, then replace the existing `activeTab === 'info'` JSX block in `JobDetailPage.tsx` with the new 3-row layout. No backend changes. Uses existing `fitAnalysis` and `job.description` fields.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons

---

### Task 1: Create FitScoreDonut component

**Files:**
- Create: `client/src/components/jobs/FitScoreDonut.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// client/src/components/jobs/FitScoreDonut.tsx
interface FitScoreDonutProps {
  score: number; // 0–100
}

const SIZE = 100;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function tierInfo(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Strong Match', color: '#16a34a' };
  if (score >= 40) return { label: 'Moderate Match', color: '#d97706' };
  return { label: 'Weak Match', color: '#dc2626' };
}

export function FitScoreDonut({ score }: FitScoreDonutProps) {
  const { label, color } = tierInfo(score);
  const filled = (score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{score}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">Match Score</p>
        <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/jobs/FitScoreDonut.tsx
git commit -m "feat: add FitScoreDonut SVG component"
```

---

### Task 2: Redesign the info tab in JobDetailPage

**Files:**
- Modify: `client/src/pages/JobDetailPage.tsx`

- [ ] **Step 1: Add `descExpanded` state**

Find the line with `const [historyOpen, setHistoryOpen] = useState(false);` and add directly after it:

```tsx
const [descExpanded, setDescExpanded] = useState(false);
```

- [ ] **Step 2: Add `FitScoreDonut` import**

In the local imports block (near the other `../components/jobs/` imports), add:

```tsx
import { FitScoreDonut } from '../components/jobs/FitScoreDonut';
```

- [ ] **Step 3: Replace the `activeTab === 'info'` block**

Find and replace the entire `{/* Job Info & Fit */}` section (everything from `{activeTab === 'info' && (` through its closing `)}`) with:

```tsx
{/* Job Info & Fit */}
{activeTab === 'info' && (
  <div className="space-y-4">

    {job.fitAnalysis && (() => {
      const fa = job.fitAnalysis as FitAnalysis;
      return (
        <>
          {/* Row 1: Match score + AI summary */}
          <div className="grid grid-cols-[1fr_1.6fr] gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-center">
              <FitScoreDonut score={fa.score} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">✦ AI Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{fa.summary}</p>
            </div>
          </div>

          {/* Row 2: Role Breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Role Breakdown</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <CheckCircle2 size={13} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Key Strengths</span>
                </div>
                <ul className="space-y-2">
                  {fa.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="flex-shrink-0 mt-0.5 text-green-500">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-600">Missing & Weak Points</span>
                </div>
                <ul className="space-y-2">
                  {fa.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="flex-shrink-0 mt-0.5 text-red-400">•</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      );
    })()}

    {/* Row 3: Job Description */}
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-3 text-sm">Job Description</h2>
      {job.description ? (
        <>
          <pre
            className={`text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed overflow-hidden ${
              descExpanded ? '' : 'line-clamp-5'
            }`}
          >
            {job.description}
          </pre>
          <button
            onClick={() => setDescExpanded((v) => !v)}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-400">
          No description added.{' '}
          <button onClick={openEdit} className="text-blue-500 hover:underline">Add one</button>
        </p>
      )}
    </div>

  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Verify visually in dev server**

Ensure `npm run dev` is running. Open a job that has `fitAnalysis` data and check:
- Row 1: donut chart (colour matches score tier) + AI summary text side by side
- Row 2: two colour-coded cards (green strengths / red gaps)
- Row 3: job description truncated to 5 lines, "Show full description ↓" expands it
- Open a job without `fitAnalysis` — only Row 3 (Job Description) shows
- Open a job without a description — "No description added. Add one." link is shown

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/JobDetailPage.tsx
git commit -m "feat: redesign Job Info & Fit tab with donut chart and role breakdown"
```

---

### Task 3: Push to main

- [ ] **Step 1: Push**

```bash
git push origin main
```
