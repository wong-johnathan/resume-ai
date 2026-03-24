# Sample Job Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to generate up to 3 realistic AI-created example job applications seeded from their profile, complete with job description, company, location, and fit analysis.

**Architecture:** Schema migration adds a counter to Profile; two new AI service functions generate title suggestions and full job data; three new Express routes (two exempt from rate limiting) serve the feature; a new `SampleJobModal` component handles the two-step UI; `JobTrackerPage` fetches usage status on mount and renders the modal.

**Tech Stack:** Prisma 5, Express, OpenAI SDK (Claude), React 18, TypeScript, Tailwind CSS, Lucide icons

---

## File Map

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `sampleJobsGenerated Int @default(0)` to Profile model |
| `server/src/services/claude.ts` | Append `generateSampleJobTitles` and `generateSampleJob` functions |
| `server/src/routes/ai.ts` | Add `SAMPLE_JOB_LIMIT` const + 3 new routes |
| `client/src/api/ai.ts` | Add `getSampleJobStatus`, `getSampleTitles`, `createSampleJob` |
| `client/src/components/jobs/SampleJobModal.tsx` | New two-step modal component |
| `client/src/pages/JobTrackerPage.tsx` | Fetch status on mount, add button, render modal |

---

### Task 1: Schema migration

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add field to Profile model**

In `server/prisma/schema.prisma`, find the Profile model and add the new field after `summaryGenerations`:

```prisma
summaryGenerations   Int      @default(0)
sampleJobsGenerated  Int      @default(0)
toursCompleted       Json     @default("{}")
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/johnathanwong/Desktop/resume-app && npm run db:migrate
```

When prompted for a migration name, enter: `add_sample_jobs_generated_to_profile`

Expected: migration applied successfully, no errors.

- [ ] **Step 3: Verify TypeScript picks up the new field**

```bash
cd /Users/johnathanwong/Desktop/resume-app/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add server/prisma/schema.prisma server/prisma/migrations/
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: add sampleJobsGenerated counter to Profile"
```

---

### Task 2: AI service functions

**Files:**
- Modify: `server/src/services/claude.ts` (append at end, before EOF)

- [ ] **Step 1: Append the two new functions to `claude.ts`**

Add this entire block at the very end of `server/src/services/claude.ts` (after the last closing `}`):

```typescript
// ─── Sample Job Generation ────────────────────────────────────────────────────

interface SampleProfileInput {
  summary?: string | null;
  experiences: Array<{ title: string; company: string }>;
  skills: Array<{ name: string; level: string }>;
}

export interface SampleJobResult {
  company: string;
  location: string;
  description: string;
  fitAnalysis: FitAnalysis;
}

export async function generateSampleJobTitles(profile: SampleProfileInput): Promise<string[]> {
  const experienceText = profile.experiences.map((e) => `${e.title} at ${e.company}`).join(', ');
  const skillsList = profile.skills.slice(0, 10).map((s) => s.name).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Suggest exactly 5 job titles for this candidate, ordered from LEAST compatible to MOST compatible with their background.

Candidate:
Experience: ${experienceText}
Skills: ${skillsList}${profile.summary ? `\nSummary: ${profile.summary}` : ''}

Return ONLY valid JSON: { "titles": ["title1", "title2", "title3", "title4", "title5"] }
First title should be quite different from their background. Last title should be a very strong match.`,
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
  return Array.isArray(parsed.titles) ? parsed.titles.slice(0, 5) : [];
}

export async function generateSampleJob(jobTitle: string, profile: SampleProfileInput): Promise<SampleJobResult> {
  const skillsList = profile.skills.slice(0, 10).map((s) => `${s.name} (${s.level})`).join(', ');
  const experienceText = profile.experiences.slice(0, 3).map((e) => `${e.title} at ${e.company}`).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1400,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Generate a realistic sample job posting for the title "${jobTitle}" and analyze how well this candidate fits it. Write the fitAnalysis in second person (e.g. "Your X years of...").

Candidate:
${profile.summary ? `Summary: ${profile.summary}\n` : ''}Experience: ${experienceText}
Skills: ${skillsList}

Return ONLY valid JSON:
{
  "company": "a realistic fictional company name",
  "location": "City, State (Remote/Hybrid/On-site)",
  "description": "full realistic job posting, 400-600 words",
  "fitAnalysis": {
    "score": <integer 0-100>,
    "strengths": ["3-5 second-person strings, e.g. Your X years of Y..."],
    "gaps": ["3-5 second-person strings, e.g. You haven't listed..."],
    "summary": "1-2 sentence narrative in second person"
  }
}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content ?? '{}') as SampleJobResult;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add server/src/services/claude.ts
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: add generateSampleJobTitles and generateSampleJob AI functions"
```

---

### Task 3: Server routes

**Files:**
- Modify: `server/src/routes/ai.ts`

**Key constraint:** Express middleware applies only to routes registered AFTER it. `router.use(requireAuth)` is on line 12; `router.use(aiRateLimit)` is on line 21. The two read-only/lightweight routes must go between these lines to avoid the rate limiter. `POST /sample-job` goes at the end (after rate limiter).

- [ ] **Step 1: Update the import line to include new service functions**

Find line 7 (the long import from `'../services/claude'`) and add `generateSampleJobTitles, generateSampleJob, SampleJobResult` to it:

```typescript
import { tailorResume, TailorChanges, generateCoverLetter, improveSummary, generateSummary, extractJobInfo, analyzeJobFit, generateInterviewCategories, generateInterviewQuestions, evaluateInterviewAnswer, generateSampleResponse, generateSampleJobTitles, generateSampleJob, InterviewCategory, InterviewFeedback } from '../services/claude';
```

- [ ] **Step 2: Add `SAMPLE_JOB_LIMIT` constant and the two pre-rate-limit routes**

Find this exact block near lines 11-22:
```typescript
const router = Router();
router.use(requireAuth);

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => getUser(req).id,
  message: { error: 'Too many AI requests, please wait 15 minutes before trying again.' },
});

router.use(aiRateLimit);
```

Replace it with:
```typescript
const router = Router();
router.use(requireAuth);

// ─── Sample job status (DB-only, no rate limit) ───────────────────────────────

const SAMPLE_JOB_LIMIT = 3;

router.get('/sample-job-status', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { sampleJobsGenerated: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ generationsUsed: profile.sampleJobsGenerated, generationsLimit: SAMPLE_JOB_LIMIT });
  } catch (err) { next(err); }
});

// ─── Sample job titles (AI call, but exempt from rate limit) ─────────────────

router.post('/sample-titles', async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const titles = await generateSampleJobTitles({
      summary: profile.summary,
      experiences: profile.experiences.map((e) => ({ title: e.title, company: e.company })),
      skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
    });

    res.json({ titles, generationsUsed: profile.sampleJobsGenerated, generationsLimit: SAMPLE_JOB_LIMIT });
  } catch (err) { next(err); }
});

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => getUser(req).id,
  message: { error: 'Too many AI requests, please wait 15 minutes before trying again.' },
});

router.use(aiRateLimit);
```

- [ ] **Step 3: Append `POST /sample-job` before `export default router`**

Find the line `export default router;` at the end of the file and insert this block immediately before it:

```typescript
// ─── Generate sample job ──────────────────────────────────────────────────────

const sampleJobSchema = z.object({
  jobTitle: z.string().min(2),
});

router.post('/sample-job', validateBody(sampleJobSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { experiences: { orderBy: { order: 'asc' }, take: 3 }, skills: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (profile.sampleJobsGenerated >= SAMPLE_JOB_LIMIT) {
      return res.status(403).json({ error: `Sample job limit of ${SAMPLE_JOB_LIMIT} reached.` });
    }

    // AI call outside the transaction — if it fails, counter is not incremented
    const result = await generateSampleJob(req.body.jobTitle, {
      summary: profile.summary,
      experiences: profile.experiences.map((e) => ({ title: e.title, company: e.company })),
      skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
    });

    // Fetch first user status for default job status
    const firstStatus = await prisma.userJobStatus.findFirst({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    // Atomic: create job + increment counter
    let job: any;
    await prisma.$transaction(async (tx) => {
      job = await tx.jobApplication.create({
        data: {
          userId,
          jobTitle: `(EXAMPLE) ${req.body.jobTitle}`,
          company: result.company,
          location: result.location,
          description: result.description,
          fitAnalysis: result.fitAnalysis as any,
          status: firstStatus?.label ?? 'SAVED',
        },
      });
      await tx.profile.update({
        where: { id: profile.id },
        data: { sampleJobsGenerated: { increment: 1 } },
      });
    });

    res.status(201).json({
      job,
      generationsUsed: profile.sampleJobsGenerated + 1,
      generationsLimit: SAMPLE_JOB_LIMIT,
    });
  } catch (err) { next(err); }
});

```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add server/src/routes/ai.ts
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: add sample job status, titles, and generation routes"
```

---

### Task 4: Client API functions

**Files:**
- Modify: `client/src/api/ai.ts`

- [ ] **Step 1: Add the three new API functions**

At the end of `client/src/api/ai.ts`, add:

```typescript
export interface SampleJobStatusResponse {
  generationsUsed: number;
  generationsLimit: number;
}

export interface SampleTitlesResponse {
  titles: string[];
  generationsUsed: number;
  generationsLimit: number;
}

export interface SampleJobResponse {
  job: import('../types').JobApplication;
  generationsUsed: number;
  generationsLimit: number;
}

export const getSampleJobStatus = () =>
  api.get<SampleJobStatusResponse>('/ai/sample-job-status').then((r) => r.data);

export const getSampleTitles = () =>
  api.post<SampleTitlesResponse>('/ai/sample-titles').then((r) => r.data);

export const createSampleJob = (jobTitle: string) =>
  api.post<SampleJobResponse>('/ai/sample-job', { jobTitle }).then((r) => r.data);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add client/src/api/ai.ts
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: add sample job client API functions"
```

---

### Task 5: SampleJobModal component

**Files:**
- Create: `client/src/components/jobs/SampleJobModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, MapPin, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FitScoreDonut } from './FitScoreDonut';
import { getSampleTitles, createSampleJob } from '../../api/ai';
import { JobApplication, FitAnalysis } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobApplication) => void;
  initialUsed: number;
}

const LIMIT = 3;

export function SampleJobModal({ open, onClose, onCreated, initialUsed }: Props) {
  const navigate = useNavigate();
  const { addToast } = useAppStore();

  const [step, setStep] = useState<'pick' | 'preview'>('pick');
  const [titles, setTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [generationsUsed, setGenerationsUsed] = useState(initialUsed);
  const [generating, setGenerating] = useState(false);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  const [error, setError] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  const effectiveTitle = customTitle.trim() || selectedTitle;
  const atLimit = generationsUsed >= LIMIT;
  const remaining = LIMIT - generationsUsed;

  // Reset and load titles on open
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSelectedTitle('');
    setCustomTitle('');
    setPreviewJob(null);
    setError('');
    setDescExpanded(false);
    setAlreadyGenerated(false);
    setGenerationsUsed(initialUsed);

    setLoadingTitles(true);
    getSampleTitles()
      .then((data) => {
        setTitles(data.titles);
        setGenerationsUsed(data.generationsUsed);
      })
      .catch(() => {
        // non-fatal — user can still type a custom title
      })
      .finally(() => setLoadingTitles(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!effectiveTitle || atLimit || alreadyGenerated) return;
    setGenerating(true);
    setError('');
    try {
      const data = await createSampleJob(effectiveTitle);
      setPreviewJob(data.job);
      setGenerationsUsed(data.generationsUsed);
      setAlreadyGenerated(true);
      setStep('preview');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Generation failed. Please try again.';
      if (e?.response?.status === 403) {
        setGenerationsUsed(LIMIT);
      }
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenJob = () => {
    if (!previewJob) return;
    onCreated(previewJob);
    onClose();
    navigate(`/jobs/${previewJob.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Sample Job" size="xl">
      {/* ── Step 1: Pick a title ── */}
      {step === 'pick' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              AI generates a realistic job posting tailored to your profile.
            </p>
            <span className={`text-xs font-medium ${remaining <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {remaining} / {LIMIT} remaining
            </span>
          </div>

          {atLimit ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              You've used all {LIMIT} sample job generations.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {loadingTitles
                    ? 'Generating suggestions from your profile…'
                    : 'Suggested titles — least → most compatible with your profile'}
                </p>
                {loadingTitles ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 w-28 bg-gray-100 rounded-full animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {titles.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedTitle(title); setCustomTitle(''); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedTitle === title && !customTitle
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {i === 0 && <span className="mr-1 opacity-50">↓</span>}
                        {i === titles.length - 1 && <span className="mr-1 opacity-60">★</span>}
                        {title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Or enter your own title</p>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => { setCustomTitle(e.target.value); setSelectedTitle(''); }}
                  placeholder="e.g. Senior Product Manager"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  {error}
                </p>
              )}

              {alreadyGenerated && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                  Already generated — open the job below ↓
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                {alreadyGenerated ? (
                  <Button onClick={() => setStep('preview')}>
                    View Preview →
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={!effectiveTitle}
                  >
                    <Sparkles size={14} /> Generate Sample →
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && previewJob && (() => {
        const fa = previewJob.fitAnalysis as FitAnalysis | null;
        return (
          <div className="space-y-4">
            {/* Job header */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">
                  Example Job
                </p>
                <h3 className="font-semibold text-gray-900">{previewJob.jobTitle}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 size={11} /> {previewJob.company}
                  </span>
                  {previewJob.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} /> {previewJob.location}
                    </span>
                  )}
                </div>
              </div>
              {fa && <FitScoreDonut score={fa.score} />}
            </div>

            {/* AI summary */}
            {fa?.summary && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">
                  ✦ AI Summary
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{fa.summary}</p>
              </div>
            )}

            {/* Job description */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Job Description</p>
              <pre
                className={`text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed overflow-hidden border rounded-lg p-3 bg-white ${
                  descExpanded ? '' : 'line-clamp-5'
                }`}
              >
                {previewJob.description}
              </pre>
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-1 text-xs text-blue-500 hover:underline"
              >
                {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
              </button>
            </div>

            {/* Generation notice */}
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              This generation has been used. {generationsUsed} / {LIMIT} used.
            </p>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('pick')}>
                <ArrowLeft size={14} /> Back
              </Button>
              <Button onClick={handleOpenJob}>
                Open Job →
              </Button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add client/src/components/jobs/SampleJobModal.tsx
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: add SampleJobModal two-step component"
```

---

### Task 6: JobTrackerPage integration

**Files:**
- Modify: `client/src/pages/JobTrackerPage.tsx`

- [ ] **Step 1: Add import for SampleJobModal and new API functions**

Find the existing import block at the top of `JobTrackerPage.tsx` and add:

```typescript
import { getSampleJobStatus } from '../api/ai';
import { SampleJobModal } from '../components/jobs/SampleJobModal';
```

- [ ] **Step 2: Add state variables**

Find the state declarations inside `JobTrackerPage` (near the existing `useState` calls) and add:

```typescript
const [sampleUsed, setSampleUsed] = useState(0);
const [sampleLimit, setSampleLimit] = useState(3);
const [sampleOpen, setSampleOpen] = useState(false);
```

- [ ] **Step 3: Fetch sample job status on mount**

Find the existing `useEffect` that calls `getJobs()` and `getJobStatuses()`:

```typescript
useEffect(() => {
  Promise.all([getJobs(), getJobStatuses()])
    .then(([j, s]) => { setJobs(j); setStatuses(s); })
    .catch(() => {})
    .finally(() => setLoading(false));
}, []);
```

Replace it with:

```typescript
useEffect(() => {
  Promise.all([
    getJobs(),
    getJobStatuses(),
    getSampleJobStatus().catch(() => null),
  ]).then(([j, s, sample]) => {
    setJobs(j);
    setStatuses(s);
    if (sample) {
      setSampleUsed(sample.generationsUsed);
      setSampleLimit(sample.generationsLimit);
    }
  }).catch(() => {}).finally(() => setLoading(false));
}, []);
```

- [ ] **Step 4: Add "Try Sample" button to the header**

Find the header button row:

```tsx
<div className="flex gap-2 flex-shrink-0">
  <TakeTourButton tourId="jobs-list" />
  <Button variant="secondary" onClick={() => setManageOpen(true)}>
    <Settings size={15} /> <span className="hidden sm:inline">Statuses</span>
  </Button>
  <Button onClick={openAdd} data-tour="add-job-btn"><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
</div>
```

Replace it with:

```tsx
<div className="flex gap-2 flex-shrink-0">
  <TakeTourButton tourId="jobs-list" />
  <Button variant="secondary" onClick={() => setManageOpen(true)}>
    <Settings size={15} /> <span className="hidden sm:inline">Statuses</span>
  </Button>
  <Button
    variant="secondary"
    onClick={() => setSampleOpen(true)}
    disabled={sampleUsed >= sampleLimit}
    title={sampleUsed >= sampleLimit ? 'Sample job limit reached' : undefined}
  >
    <Sparkles size={15} />
    <span className="hidden sm:inline">Try Sample</span>
    <span className="text-xs text-gray-400 ml-1">{sampleLimit - sampleUsed}/{sampleLimit}</span>
  </Button>
  <Button onClick={openAdd} data-tour="add-job-btn"><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
</div>
```

- [ ] **Step 5: Render SampleJobModal**

Find where `<ManageStatusesModal>` is rendered (near the bottom of the JSX return, before the closing `</div>`) and add `<SampleJobModal>` right after it:

```tsx
<SampleJobModal
  open={sampleOpen}
  onClose={() => setSampleOpen(false)}
  onCreated={() => setSampleUsed((n) => n + 1)}
  initialUsed={sampleUsed}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git -C /Users/johnathanwong/Desktop/resume-app add client/src/pages/JobTrackerPage.tsx
git -C /Users/johnathanwong/Desktop/resume-app commit -m "feat: integrate SampleJobModal into JobTrackerPage"
```

---

### Task 7: Push to main

- [ ] **Step 1: Push**

```bash
git -C /Users/johnathanwong/Desktop/resume-app push origin main
```
