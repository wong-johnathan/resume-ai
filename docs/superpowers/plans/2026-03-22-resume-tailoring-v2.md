# Resume Tailoring V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade resume tailoring to use `gpt-4.1` with a structured prompt that returns a change changelog alongside the tailored content, then display a side-by-side diff with AI explanations on the tailored resume detail page.

**Architecture:** A single AI call returns `{ tailored: ResumeContent, changes: ChangeLog }` validated with Zod. Two new nullable JSON columns on `Resume` store the changelog and a snapshot of the source resume. The client renders a Changes tab on `ResumeDetailPage` only for tailored resumes with change data.

**Tech Stack:** Express + Prisma + PostgreSQL + OpenAI SDK (`gpt-4.1`), React 18 + TypeScript + Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-22-resume-tailoring-v2-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/prisma/schema.prisma` | Modify | Add `tailorChanges Json?` and `tailorSourceSnapshot Json?` to `Resume` |
| `server/src/services/claude.ts` | Modify | Rewrite `tailorResume()` — new prompt, `gpt-4.1`, structured output schema, Zod validation |
| `server/src/routes/ai.ts` | Modify | Update `POST /api/ai/tailor` — snapshot logic, destructure new response, store new fields |
| `client/src/types/index.ts` | Modify | Add `TailorChanges` interface; add `tailorChanges` and `tailorSourceSnapshot` to `Resume` |
| `client/src/components/resume/TailorChangesPanel.tsx` | Create | Changes tab UI — overall summary, section cards, side-by-side diff, per-item badge rows |
| `client/src/pages/ResumeDetailPage.tsx` | Modify | Add two-tab layout (Preview / Changes); render `TailorChangesPanel` in Changes tab |

---

## Task 1: Add Prisma Schema Columns

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the two new columns to the `Resume` model**

Open `server/prisma/schema.prisma`. The `Resume` model currently ends with:

```prisma
  coverLetter String?      @db.Text
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
```

Insert the two new fields after the existing `coverLetter` line (do not duplicate `coverLetter`, `createdAt`, or `updatedAt` — they already exist):

```prisma
  tailorChanges        Json?
  tailorSourceSnapshot Json?
```

The final `Resume` model fields should end with:
```prisma
  coverLetter          String?      @db.Text
  tailorChanges        Json?
  tailorSourceSnapshot Json?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
```

- [ ] **Step 2: Push schema to the database**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run db:migrate -- --name add_tailor_changes_columns
```

Wait for output: `Your database is now in sync with your schema.`

> Note: `npm run db:migrate` runs `prisma migrate dev`. The `--name` flag prevents an interactive prompt for the migration name. Both new columns are nullable so no data migration is needed.

- [ ] **Step 3: Verify the columns exist**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run db:studio
```

Open Prisma Studio in the browser → navigate to the `Resume` table → confirm `tailorChanges` and `tailorSourceSnapshot` columns are present (both nullable, no data yet).

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add tailorChanges and tailorSourceSnapshot columns to Resume"
```

---

## Task 2: Rewrite `tailorResume()` in the AI Service

**Files:**
- Modify: `server/src/services/claude.ts`

This task rewrites only the `tailorResume` function. All other functions in this file are untouched.

- [ ] **Step 1: Add the `TailorResult` and `TailorChanges` types**

At the top of `server/src/services/claude.ts`, after the `ResumeContent` interface, add:

```typescript
// ─── Tailor Result Types ──────────────────────────────────────────────────────

export interface BulletChange {
  type: 'reworded' | 'added' | 'removed' | 'unchanged';
  original: string | null;
  rewritten: string | null;
  reason: string;
}

export interface SkillChange {
  type: 'added' | 'removed' | 'reordered' | 'unchanged';
  name: string;
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

export interface TailorResult {
  tailored: ResumeContent;
  changes: TailorChanges;
}
```

- [ ] **Step 2: Add the Zod import**

The current `server/src/services/claude.ts` does not import Zod. Add it at the top of the file alongside the existing imports:

```typescript
import { z } from 'zod';
```

- [ ] **Step 3: Add the Zod validation schema for `TailorResult`**

After the new interfaces (still in `server/src/services/claude.ts`), add:

```typescript
// ─── Tailor Result Zod Schema ─────────────────────────────────────────────────

const bulletChangeSchema = z.object({
  type: z.enum(['reworded', 'added', 'removed', 'unchanged']),
  original: z.string().nullable(),
  rewritten: z.string().nullable(),
  reason: z.string(),
});

const experienceChangeSchema = z.object({
  index: z.number().int().min(0),
  company: z.string(),
  title: z.string(),
  sectionSummary: z.string(),
  bulletChanges: z.array(bulletChangeSchema),
});

const tailorChangesSchema = z.object({
  overallSummary: z.string(),
  summary: z.object({
    sectionSummary: z.string(),
    original: z.string(),
    rewritten: z.string(),
  }),
  experiences: z.array(experienceChangeSchema),
  skills: z.object({
    sectionSummary: z.string(),
    skillChanges: z.array(z.object({
      type: z.enum(['added', 'removed', 'reordered', 'unchanged']),
      name: z.string(),
      reason: z.string(),
    })),
  }),
});
```

- [ ] **Step 4: Replace the `tailorResume` function**

Find the existing `tailorResume` function (lines 68–95 in the current file) and replace it entirely with:

```typescript
// ─── Resume Tailoring ────────────────────────────────────────────────────────

export async function tailorResume(contentJson: ResumeContent, jobDescription: string): Promise<TailorResult> {
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your job is to tailor a resume to a specific job description.

PROCESS (follow in order):
1. READ the job description carefully. Extract: required skills, preferred skills, key responsibilities, seniority signals, and exact keywords used.
2. REWRITE the professional summary in 2-3 sentences that directly address the role's core ask and incorporate top keywords.
3. FOR EACH experience entry: rewrite bullet points to quantify impact and surface JD-relevant keywords — ONLY where the candidate's actual experience supports it. Never invent or fabricate anything.
4. REORDER skills so the most JD-relevant ones appear first. Remove skills that are clearly irrelevant noise.
5. PRODUCE the output JSON with both the tailored resume content and a detailed change log.

RULES:
- NEVER fabricate skills, experience, achievements, companies, dates, or credentials the candidate does not have.
- Rewrite based on emphasis and framing of real facts — not invention.
- Every change must have a specific, actionable reason tied to the job description.
- Unchanged content is still listed in the changelog with type "unchanged".`;

  const userPrompt = `Tailor this resume for the job description below. Return a JSON object matching this exact schema:

{
  "tailored": { /* Same structure as the input resume — all fields preserved, content rewritten where appropriate */ },
  "changes": {
    "overallSummary": "One sentence describing total changes made and the target role",
    "summary": {
      "sectionSummary": "Why the summary was rewritten",
      "original": "The original summary text",
      "rewritten": "The new summary text"
    },
    "experiences": [
      {
        "index": 0,
        "company": "Company Name",
        "title": "Job Title",
        "sectionSummary": "Brief description of changes to this entry",
        "bulletChanges": [
          {
            "type": "reworded",
            "original": "original bullet text",
            "rewritten": "new bullet text",
            "reason": "Specific reason tied to JD — e.g. 'JD requires cross-functional leadership, reframed to highlight team coordination'"
          }
        ]
      }
    ],
    "skills": {
      "sectionSummary": "How skills were reordered/filtered",
      "skillChanges": [
        {
          "type": "reordered",
          "name": "React",
          "reason": "JD lists React as a primary requirement — moved to top"
        }
      ]
    }
  }
}

RESUME JSON:
${JSON.stringify(contentJson, null, 2)}

JOB DESCRIPTION:
${jobDescription}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    max_tokens: 8000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned invalid JSON during resume tailoring');
  }

  const result = parsed as { tailored: unknown; changes: unknown };

  const changes = tailorChangesSchema.parse(result.changes);
  const tailored = result.tailored as ResumeContent;

  if (!tailored || typeof tailored !== 'object') {
    throw new Error('AI returned malformed tailored resume content');
  }

  return { tailored, changes };
}
```

> Note: We use `response_format: { type: 'json_object' }` (the JSON mode supported by all gpt-4.1 variants) rather than `json_schema` strict mode, combined with Zod validation as the enforcing layer. This is the most reliable pattern for complex nested schemas on OpenAI.

- [ ] **Step 5: Verify the server still compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run dev:server
```

Expected: Server starts on port 3000 with no TypeScript errors. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/claude.ts
git commit -m "feat: rewrite tailorResume with gpt-4.1, structured changelog output, and Zod validation"
```

---

## Task 3: Update the Tailor Route

**Files:**
- Modify: `server/src/routes/ai.ts`

> **Design note — snapshot vs AI input:** The `tailorSourceSnapshot` is stored for the *UI diff* only. The AI always receives the current profile content as input (not the previous tailored version) so it produces a fresh, high-quality tailoring from the authoritative source. The `changes` object the AI produces explains profile→new-tailored changes. The UI uses `tailorSourceSnapshot` to visually show previous-tailored→new-tailored differences. These serve complementary purposes. The `tailorResume()` function signature does not need the snapshot.

- [ ] **Step 1: Update the import from the AI service**

In `server/src/routes/ai.ts`, find the import line:

```typescript
import { tailorResume, generateCoverLetter, ... } from '../services/claude';
```

Add `TailorChanges` to the import (needed for type annotation):

```typescript
import { tailorResume, TailorChanges, generateCoverLetter, improveSummary, generateSummary, extractJobInfo, analyzeJobFit, generateInterviewCategories, generateInterviewQuestions, evaluateInterviewAnswer, generateSampleResponse, InterviewCategory, InterviewFeedback } from '../services/claude';
```

- [ ] **Step 2: Replace the tailor route handler body**

Find the `router.post('/tailor', ...)` handler in `server/src/routes/ai.ts`. Replace the entire handler body (keep the route signature) with:

```typescript
router.post('/tailor', validateBody(tailorSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    // Check amendment limit if a jobId is provided
    if (req.body.jobId) {
      const amendmentCount = await prisma.aiAmendment.count({
        where: { jobApplicationId: req.body.jobId },
      });
      if (amendmentCount >= AI_AMENDMENT_LIMIT) {
        return res.status(403).json({ error: `AI amendment limit of ${AI_AMENDMENT_LIMIT} reached for this job posting.` });
      }
    }

    // Build resume content from the user's current profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' } }, educations: { orderBy: { order: 'asc' } }, skills: true, certifications: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const profileContent = profileToResumeContent(profile);

    // Determine source snapshot:
    // - If the job already has a linked resume, snapshot that resume's content (re-tailor diff)
    // - Otherwise, snapshot the profile-derived content (first tailor diff)
    let tailorSourceSnapshot: object = profileContent;
    if (req.body.jobId) {
      const existingJob = await prisma.jobApplication.findFirst({
        where: { id: req.body.jobId, userId },
        include: { resume: true },
      });
      if (existingJob?.resume?.contentJson) {
        tailorSourceSnapshot = existingJob.resume.contentJson as object;
      }
    }

    // Call AI — returns { tailored, changes }
    const { tailored, changes } = await tailorResume(profileContent, req.body.jobDescription);

    // Create tailored resume clone
    const clone = await prisma.resume.create({
      data: {
        userId,
        title: 'Tailored Resume',
        templateId: req.body.templateId,
        contentJson: tailored as any,
        tailoredFor: req.body.jobId ?? 'job',
        tailorChanges: changes as any,
        tailorSourceSnapshot: tailorSourceSnapshot as any,
      },
    });

    // Link clone to job application and record the amendment
    if (req.body.jobId) {
      await prisma.jobApplication.updateMany({
        where: { id: req.body.jobId, userId },
        data: { resumeId: clone.id },
      });
      await prisma.aiAmendment.create({
        data: {
          jobApplicationId: req.body.jobId,
          type: 'RESUME_TAILOR',
          resumeId: clone.id,
        },
      });
    }

    res.json(clone);
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Verify the server compiles and starts**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run dev:server
```

Expected: Server starts on port 3000, no TypeScript errors. Stop with Ctrl+C.

- [ ] **Step 4: Smoke test the tailor endpoint manually**

Start the full dev stack:
```bash
npm run dev
```

In the app, navigate to a job that has a description → click "Tailor with AI" → pick a template → submit. Check:
- Toast shows "Resume tailored and linked to this job!"
- Navigating to the new tailored resume shows the resume preview
- In the database (via `npm run db:studio`), the new `Resume` row has non-null `tailorChanges` and `tailorSourceSnapshot` JSON

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ai.ts
git commit -m "feat: update tailor route to store tailorChanges and tailorSourceSnapshot"
```

---

## Task 4: Update Client Types

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Add the `TailorChanges` type and update `Resume`**

Open `client/src/types/index.ts`. Add the `TailorChanges` interface before the `Resume` interface:

```typescript
export interface BulletChange {
  type: 'reworded' | 'added' | 'removed' | 'unchanged';
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
    skillChanges: Array<{
      type: 'added' | 'removed' | 'reordered' | 'unchanged';
      name: string;
      reason: string;
    }>;
  };
}
```

Then update the `Resume` interface to include the two new optional fields:

```typescript
export interface Resume {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED';
  contentJson: ResumeContent;
  tailoredFor?: string | null;
  coverLetter?: string | null;
  tailorChanges?: TailorChanges | null;
  tailorSourceSnapshot?: ResumeContent | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify the client still compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run dev:client
```

Expected: Vite dev server starts on port 5173 with no TypeScript errors in the terminal. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add TailorChanges types and tailorChanges/tailorSourceSnapshot to Resume interface"
```

---

## Task 5: Build the TailorChangesPanel Component

**Files:**
- Create: `client/src/components/resume/TailorChangesPanel.tsx`

This component receives the `tailorChanges` and `tailorSourceSnapshot` from the resume and renders the full changes tab content.

- [ ] **Step 1: Create the component file**

Create `client/src/components/resume/TailorChangesPanel.tsx`:

```tsx
import { TailorChanges, ResumeContent } from '../../types';

interface Props {
  changes: TailorChanges;
  source: ResumeContent;   // tailorSourceSnapshot — the "before" state
  current: ResumeContent;  // contentJson — the "after" state
}

const BADGE_STYLES: Record<string, string> = {
  reworded: 'bg-blue-50 text-blue-700 border-blue-200',
  added: 'bg-green-50 text-green-700 border-green-200',
  removed: 'bg-red-50 text-red-700 border-red-200',
  reordered: 'bg-purple-50 text-purple-700 border-purple-200',
};

function Badge({ type }: { type: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${BADGE_STYLES[type] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {type}
    </span>
  );
}

function SideBySide({ left, right, label }: { left: string; right: string; label?: string }) {
  const changed = left.trim() !== right.trim();
  return (
    <div className="mt-2">
      {label && <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className={`text-xs p-2.5 rounded-lg border ${changed ? 'bg-red-50 border-red-100 text-red-900' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-gray-400">Before</p>
          <p className="whitespace-pre-wrap leading-relaxed">{left || <em className="text-gray-400">—</em>}</p>
        </div>
        <div className={`text-xs p-2.5 rounded-lg border ${changed ? 'bg-green-50 border-green-100 text-green-900' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-gray-400">After</p>
          <p className="whitespace-pre-wrap leading-relaxed">{right || <em className="text-gray-400">—</em>}</p>
        </div>
      </div>
    </div>
  );
}

export function TailorChangesPanel({ changes, source, current }: Props) {
  return (
    <div className="space-y-4 px-4 py-4 max-w-4xl mx-auto">
      {/* Overall summary */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
        <p className="text-sm font-medium text-purple-800">{changes.overallSummary}</p>
      </div>

      {/* Summary section */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-1">Professional Summary</h3>
        <p className="text-xs text-gray-500 mb-2">{changes.summary.sectionSummary}</p>
        <SideBySide left={changes.summary.original} right={changes.summary.rewritten} />
      </div>

      {/* Experience sections */}
      {changes.experiences.map((exp) => {
        const sourceExp = source.experiences[exp.index];
        const currentExp = current.experiences[exp.index];
        return (
          <div key={exp.index} className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-gray-900">{exp.title}</h3>
            <p className="text-xs text-gray-400 mb-1">{exp.company}</p>
            <p className="text-xs text-gray-500 mb-3">{exp.sectionSummary}</p>

            {/* Side-by-side full description */}
            <SideBySide
              left={sourceExp?.description ?? ''}
              right={currentExp?.description ?? ''}
            />

            {/* Per-bullet change rows (skip unchanged) */}
            {exp.bulletChanges.filter((b) => b.type !== 'unchanged').length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Change Details</p>
                {exp.bulletChanges
                  .filter((b) => b.type !== 'unchanged')
                  .map((bullet, bi) => (
                    <div key={bi} className="flex gap-2 items-start text-xs">
                      <Badge type={bullet.type} />
                      <p className="text-gray-600 flex-1">{bullet.reason}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Skills section */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-1">Skills</h3>
        <p className="text-xs text-gray-500 mb-3">{changes.skills.sectionSummary}</p>

        {/* Side-by-side skill lists */}
        <SideBySide
          left={source.skills.map((s) => s.name).join(', ')}
          right={current.skills.map((s) => s.name).join(', ')}
        />

        {/* Per-skill change rows (skip unchanged) */}
        {changes.skills.skillChanges.filter((s) => s.type !== 'unchanged').length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Change Details</p>
            {changes.skills.skillChanges
              .filter((s) => s.type !== 'unchanged')
              .map((skill, si) => (
                <div key={si} className="flex gap-2 items-start text-xs">
                  <Badge type={skill.type} />
                  <span className="font-medium text-gray-700 flex-shrink-0">{skill.name}:</span>
                  <p className="text-gray-600 flex-1">{skill.reason}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the client builds**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run dev:client
```

Expected: No TypeScript errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/resume/TailorChangesPanel.tsx
git commit -m "feat: add TailorChangesPanel component for side-by-side diff view"
```

---

## Task 6: Update ResumeDetailPage with Tab Navigation

**Files:**
- Modify: `client/src/pages/ResumeDetailPage.tsx`

- [ ] **Step 1: Add the tab state and import**

In `client/src/pages/ResumeDetailPage.tsx`, update the import line to include `TailorChangesPanel`:

```tsx
import { TailorChangesPanel } from '../components/resume/TailorChangesPanel';
```

Add a tab state variable after the existing `useState` declarations (near line 14):

```tsx
const [activeTab, setActiveTab] = useState<'preview' | 'changes'>('preview');
```

- [ ] **Step 2: Add the tab navigation bar**

The current page has a single top bar div. Add a tab bar immediately below the top bar (between the top bar and the preview area). Find the comment `{/* Preview area */}` and insert before it:

```tsx
{/* Tab navigation — only shown for tailored resumes with change data */}
{resume.tailoredFor && resume.tailorChanges && (
  <div className="flex border-b bg-white px-4 sm:px-6 flex-shrink-0">
    <button
      onClick={() => setActiveTab('preview')}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        activeTab === 'preview'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      Preview
    </button>
    <button
      onClick={() => setActiveTab('changes')}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        activeTab === 'changes'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      Changes
    </button>
  </div>
)}
```

- [ ] **Step 3: Conditionally render preview vs changes panel**

Replace the entire `{/* Preview area */}` block (lines 83–125 in the current file) with the following. This is the **complete replacement** — do not leave any of the old preview div in place:

```tsx
{/* Preview area or Changes tab */}
{activeTab === 'preview' || !resume.tailoredFor || !resume.tailorChanges ? (
  <div className="bg-gray-100 overflow-auto relative" style={{ minHeight: previewScale < 1 ? `${1122 * previewScale + 32}px` : 'calc(100vh - 65px)' }}>
    <button
      onClick={() => setPreviewKey((k) => k + 1)}
      className="sticky top-3 float-right mr-3 z-10 bg-white border rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 shadow-sm flex items-center gap-1.5"
      title="Reload preview"
    >
      <RefreshCw size={12} /> Refresh
    </button>

    {previewScale < 1 ? (
      <div style={{ width: `${794 * previewScale}px`, height: `${1122 * previewScale}px`, overflow: 'hidden' }}>
        <iframe
          key={previewKey}
          src={getPreviewUrl(resume.id)}
          title="Resume Preview"
          style={{
            width: '794px',
            height: '1122px',
            border: 'none',
            display: 'block',
            background: '#fff',
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    ) : (
      <iframe
        key={previewKey}
        src={getPreviewUrl(resume.id)}
        title="Resume Preview"
        className="w-full border-none block"
        style={{ minHeight: '1122px', background: '#fff' }}
        onLoad={(e) => {
          try {
            const doc = e.currentTarget.contentDocument;
            if (doc) e.currentTarget.style.height = doc.documentElement.scrollHeight + 'px';
          } catch {}
        }}
      />
    )}
  </div>
) : (
  <div className="bg-gray-50 overflow-auto flex-1">
    <TailorChangesPanel
      changes={resume.tailorChanges}
      source={resume.tailorSourceSnapshot ?? resume.contentJson}
      current={resume.contentJson}
    />
  </div>
)}
```

> Note: `resume.tailorSourceSnapshot ?? resume.contentJson` — if the snapshot is missing for any reason, we fall back to comparing against the current content, which safely shows no diff.

- [ ] **Step 4: Verify the full app renders correctly**

```bash
cd /Users/johnathanwong/Desktop/resume-app
npm run dev
```

Test the following scenarios in the browser:

1. **Non-tailored resume:** Navigate to any resume without `tailoredFor` → confirm only the preview renders, no tabs appear
2. **Old tailored resume (no tailorChanges):** If any exist from before this feature, navigate to one → confirm only the preview renders (tabs hidden since `tailorChanges` is null)
3. **New tailored resume:** Tailor a resume for a job → navigate to the new tailored resume → confirm:
   - Two tabs appear: "Preview" and "Changes"
   - Preview tab shows the resume iframe (default)
   - Changes tab shows the `TailorChangesPanel` with the overall summary, section cards, side-by-side before/after, and badge rows

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ResumeDetailPage.tsx
git commit -m "feat: add Changes tab to tailored resume detail page with side-by-side diff"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Full flow test**

With `npm run dev` running:

1. Go to a job with a description
2. Tailor a resume using a template
3. Navigate to the tailored resume detail page
4. Switch to the Changes tab
5. Verify:
   - Overall summary sentence is readable and accurate
   - Summary section shows before/after text with color highlights
   - Each experience shows a section summary and side-by-side description diff
   - Badge rows (reworded/added/removed) appear for non-unchanged bullets with clear reasons
   - Skills section shows before/after skill lists and per-skill change rows
   - Preview tab still shows the resume iframe correctly
   - Back arrow on the resume page links to the correct job

- [ ] **Step 2: Re-tailor test (diff between two tailored versions)**

1. On the same job, tailor again (if amendment count < 3)
2. Navigate to the newest tailored resume
3. Confirm the "Before" column in the Changes tab shows the *previous tailored version's* content, not the original profile

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p   # stage only what changed
git commit -m "fix: end-to-end tailor v2 corrections"
```
