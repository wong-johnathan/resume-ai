# Guided Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided spotlight tour that auto-triggers on first visit to `/jobs`, `/jobs/:id`, and `/jobs/:id/prep`, stored server-side, with a "Take a tour" button for replays.

**Architecture:** A `TourContext` (React Query for server state + local state for active tour) drives a `TourOverlay` rendered via a React Portal. Tour completion is persisted in a `toursCompleted Json` field on the `Profile` model. Three separate tour configs define step targets using `data-tour` attributes.

**Tech Stack:** React 18, TypeScript, Zustand, React Query, Prisma 5, Express, Zod, Tailwind CSS

---

## File Map

### Create
- `server/src/routes/tours.ts` — GET/POST/DELETE endpoints for tour completion
- `client/src/api/tours.ts` — API wrapper functions
- `client/src/tours/types.ts` — `TourId`, `TourStep`, `TourConfig` types
- `client/src/tours/configs/jobsListTour.ts` — 1-step jobs list tour
- `client/src/tours/configs/jobDetailTour.ts` — 7-step job detail tour
- `client/src/tours/configs/jobPrepTour.ts` — 3-step interview prep tour
- `client/src/tours/index.ts` — re-exports all configs as a `Record<TourId, TourConfig>`
- `client/src/context/TourContext.tsx` — provider, context, all tour logic
- `client/src/hooks/useTour.ts` — thin convenience hook used by each page
- `client/src/components/tour/TourOverlay.tsx` — SVG spotlight + tooltip portal
- `client/src/components/tour/TakeTourButton.tsx` — reusable "Take a tour" button

### Modify
- `server/prisma/schema.prisma` — add `toursCompleted Json @default("{}")` to `Profile`
- `server/src/app.ts` — register tours router at `/api/tours`
- `client/src/App.tsx` — wrap routes with `<TourProvider>`
- `client/src/components/layout/AppLayout.tsx` — add `<TourOverlay />`
- `client/src/pages/JobTrackerPage.tsx` — `data-tour` attrs + `useTour` + stop condition + `TakeTourButton`
- `client/src/pages/JobDetailPage.tsx` — `data-tour` attrs + `useTour` + `TakeTourButton`
- `client/src/components/jobs/InterviewPrepPanel.tsx` — `data-tour` attrs + `useTour` + `TakeTourButton`

---

## Task 1: DB Schema + Server Route

**Files:**
- Modify: `server/prisma/schema.prisma:47`
- Create: `server/src/routes/tours.ts`
- Modify: `server/src/app.ts:18,64`

- [ ] **Step 1: Add `toursCompleted` field to Profile model**

In `server/prisma/schema.prisma`, add after `summaryGenerations Int @default(0)` (line 47):

```prisma
toursCompleted   Json     @default("{}")
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/johnathanwong/Desktop/resume-app && npm run db:migrate
```

Expected: Prisma applies migration, prints "Your database is now in sync with your schema."

- [ ] **Step 3: Create `server/src/routes/tours.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

const TOUR_IDS = ['jobs-list', 'job-detail', 'job-prep'] as const;
const tourIdSchema = z.enum(TOUR_IDS);

// GET /api/tours — return current completion map
router.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const toursCompleted = (profile?.toursCompleted ?? {}) as Record<string, string>;
    res.json({ toursCompleted });
  } catch (err) { next(err); }
});

// POST /api/tours/:tourId/complete — mark a tour done
router.post('/:tourId/complete', async (req, res, next) => {
  try {
    const parsed = tourIdSchema.safeParse(req.params.tourId);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid tour ID' });
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const current = (profile?.toursCompleted ?? {}) as Record<string, string>;
    const updated = { ...current, [parsed.data]: new Date().toISOString() };
    await prisma.profile.update({
      where: { userId: getUser(req).id },
      data: { toursCompleted: updated },
    });
    res.json({ toursCompleted: updated });
  } catch (err) { next(err); }
});

// DELETE /api/tours/:tourId/complete — reset a tour so it re-triggers
router.delete('/:tourId/complete', async (req, res, next) => {
  try {
    const parsed = tourIdSchema.safeParse(req.params.tourId);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid tour ID' });
    const profile = await prisma.profile.findUnique({
      where: { userId: getUser(req).id },
      select: { toursCompleted: true },
    });
    const current = { ...(profile?.toursCompleted ?? {}) } as Record<string, string>;
    delete current[parsed.data];
    await prisma.profile.update({
      where: { userId: getUser(req).id },
      data: { toursCompleted: current },
    });
    res.json({ toursCompleted: current });
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: Register the router in `server/src/app.ts`**

Add import after line 18 (`import interviewPrepRouter`):
```typescript
import toursRouter from './routes/tours';
```

Add mount after line 64 (`app.use('/api/interview-prep', interviewPrepRouter);`):
```typescript
app.use('/api/tours', toursRouter);
```

- [ ] **Step 5: Verify server starts**

```bash
cd /Users/johnathanwong/Desktop/resume-app && npm run dev:server
```

Expected: Server starts on port 3000 with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/src/routes/tours.ts server/src/app.ts
git commit -m "feat: add toursCompleted to Profile and /api/tours route"
```

---

## Task 2: Client API + Tour Types + Configs

**Files:**
- Create: `client/src/api/tours.ts`
- Create: `client/src/tours/types.ts`
- Create: `client/src/tours/configs/jobsListTour.ts`
- Create: `client/src/tours/configs/jobDetailTour.ts`
- Create: `client/src/tours/configs/jobPrepTour.ts`
- Create: `client/src/tours/index.ts`

- [ ] **Step 1: Create `client/src/api/tours.ts`**

```typescript
import api from './client';

export type TourId = 'jobs-list' | 'job-detail' | 'job-prep';

export const getTours = (): Promise<Record<TourId, string>> =>
  api.get<{ toursCompleted: Record<TourId, string> }>('/tours').then((r) => r.data.toursCompleted);

export const completeTour = (tourId: TourId): Promise<Record<TourId, string>> =>
  api.post<{ toursCompleted: Record<TourId, string> }>(`/tours/${tourId}/complete`).then((r) => r.data.toursCompleted);

export const resetTour = (tourId: TourId): Promise<Record<TourId, string>> =>
  api.delete<{ toursCompleted: Record<TourId, string> }>(`/tours/${tourId}/complete`).then((r) => r.data.toursCompleted);
```

- [ ] **Step 2: Create `client/src/tours/types.ts`**

```typescript
import type { TourId } from '../api/tours';

export type { TourId };

export interface TourStep {
  /** CSS selector for the element to spotlight — uses data-tour attributes */
  selector: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  /**
   * If set, the tour advances automatically when this CSS selector appears in the DOM
   * (used for the prep tour where category-selector renders after a button click)
   */
  autoAdvanceWhenSelector?: string;
}

export interface TourConfig {
  id: TourId;
  steps: TourStep[];
}
```

- [ ] **Step 3: Create `client/src/tours/configs/jobsListTour.ts`**

```typescript
import type { TourConfig } from '../types';

export const jobsListTour: TourConfig = {
  id: 'jobs-list',
  steps: [
    {
      selector: '[data-tour="add-job-btn"]',
      title: 'Track a new job',
      body: 'Click here to add a job application. Paste in the job description to unlock AI resume tailoring, cover letter generation, and fit analysis.',
      placement: 'bottom',
    },
  ],
};
```

- [ ] **Step 4: Create `client/src/tours/configs/jobDetailTour.ts`**

```typescript
import type { TourConfig } from '../types';

export const jobDetailTour: TourConfig = {
  id: 'job-detail',
  steps: [
    {
      selector: '[data-tour="job-description"]',
      title: 'Job Description',
      body: 'Paste the full job description here. It powers AI tailoring, cover letter generation, and fit analysis.',
      placement: 'top',
    },
    {
      selector: '[data-tour="fit-analysis"]',
      title: 'Fit Analysis',
      body: 'After adding a job description, Claude scores how well your profile matches the role and highlights strengths and gaps.',
      placement: 'top',
    },
    {
      selector: '[data-tour="interview-prep-link"]',
      title: 'Interview Prep',
      body: 'Click here to generate tailored interview questions based on this job and your profile.',
      placement: 'top',
    },
    {
      selector: '[data-tour="job-notes"]',
      title: 'Notes',
      body: 'Keep track of interview notes, contacts, and follow-up reminders here.',
      placement: 'top',
    },
    {
      selector: '[data-tour="job-status"]',
      title: 'Application Status',
      body: 'Update your application status as you progress through the hiring process.',
      placement: 'left',
    },
    {
      selector: '[data-tour="job-resume"]',
      title: 'Resume & AI Tailoring',
      body: 'Select a template and let Claude tailor your resume specifically for this job. You get 3 AI amendments per job.',
      placement: 'left',
    },
    {
      selector: '[data-tour="job-cover-letter"]',
      title: 'Cover Letter',
      body: 'Generate a personalised cover letter with Claude. Choose your tone — Professional, Conversational, or Enthusiastic.',
      placement: 'left',
    },
  ],
};
```

- [ ] **Step 5: Create `client/src/tours/configs/jobPrepTour.ts`**

```typescript
import type { TourConfig } from '../types';

export const jobPrepTour: TourConfig = {
  id: 'job-prep',
  steps: [
    {
      selector: '[data-tour="prep-panel"]',
      title: 'Interview Prep',
      body: 'This panel generates AI-powered interview questions tailored to this job and your experience. Start here to prepare.',
      placement: 'top',
    },
    {
      selector: '[data-tour="prepare-btn"]',
      title: 'Generate Question Categories',
      body: 'Click "Prepare for Interview" to let Claude analyse the job description and suggest relevant interview question categories.',
      placement: 'bottom',
      // Tour auto-advances to step 2 when the category selector appears in the DOM
      autoAdvanceWhenSelector: '[data-tour="category-selector"]',
    },
    {
      selector: '[data-tour="category-selector"]',
      title: 'Choose Your Focus Areas',
      body: 'Select which categories to prepare for and how many questions per category, then generate your personalised question set.',
      placement: 'top',
    },
  ],
};
```

- [ ] **Step 6: Create `client/src/tours/index.ts`**

```typescript
export { jobsListTour } from './configs/jobsListTour';
export { jobDetailTour } from './configs/jobDetailTour';
export { jobPrepTour } from './configs/jobPrepTour';
export type { TourId, TourStep, TourConfig } from './types';

import type { TourId, TourConfig } from './types';
import { jobsListTour } from './configs/jobsListTour';
import { jobDetailTour } from './configs/jobDetailTour';
import { jobPrepTour } from './configs/jobPrepTour';

export const TOUR_CONFIGS: Record<TourId, TourConfig> = {
  'jobs-list': jobsListTour,
  'job-detail': jobDetailTour,
  'job-prep': jobPrepTour,
};
```

- [ ] **Step 7: Commit**

```bash
git add client/src/api/tours.ts client/src/tours/
git commit -m "feat: add tour API client and step configs"
```

---

## Task 3: TourContext

**Files:**
- Create: `client/src/context/TourContext.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create `client/src/context/TourContext.tsx`**

```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTours, completeTour as completeTourApi, resetTour as resetTourApi, TourId } from '../api/tours';
import { TOUR_CONFIGS, TourStep } from '../tours';

interface TourContextValue {
  // Server state
  toursCompleted: Record<string, string>;
  isLoadingTours: boolean;
  // Active tour state
  activeTourId: TourId | null;
  activeStepIndex: number;
  activeStep: TourStep | null;
  totalSteps: number;
  targetRect: DOMRect | null;
  // Actions
  shouldAutoStart: (tourId: TourId) => boolean;
  startTour: (tourId: TourId) => void;
  nextStep: () => void;
  endTour: () => void;
  completeTour: () => void;
  resetTour: (tourId: TourId) => void;
}

const TourContext = createContext<TourContextValue>({
  toursCompleted: {},
  isLoadingTours: true,
  activeTourId: null,
  activeStepIndex: 0,
  activeStep: null,
  totalSteps: 0,
  targetRect: null,
  shouldAutoStart: () => false,
  startTour: () => {},
  nextStep: () => {},
  endTour: () => {},
  completeTour: () => {},
  resetTour: () => {},
});

export function TourProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: toursCompleted = {}, isLoading: isLoadingTours } = useQuery({
    queryKey: ['tours'],
    queryFn: getTours,
    staleTime: Infinity,
  });

  const completeMutation = useMutation({
    mutationFn: completeTourApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
  });

  const resetMutation = useMutation({
    mutationFn: resetTourApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
  });

  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const measureAttempts = useRef(0);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const activeConfig = activeTourId ? TOUR_CONFIGS[activeTourId] : null;
  const activeStep = activeConfig ? activeConfig.steps[activeStepIndex] : null;
  const totalSteps = activeConfig ? activeConfig.steps.length : 0;

  const measureTarget = useCallback((selector: string) => {
    measureAttempts.current = 0;
    const attempt = () => {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll to settle before measuring
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          // ResizeObserver keeps the spotlight aligned as content reflows
          resizeObserverRef.current?.disconnect();
          resizeObserverRef.current = new ResizeObserver(() => {
            setTargetRect(el.getBoundingClientRect());
          });
          resizeObserverRef.current.observe(el);
        }, 300);
      } else if (measureAttempts.current < 10) {
        measureAttempts.current++;
        setTimeout(attempt, 100);
      } else {
        // Element not found after max retries (e.g. conditionally-rendered card absent) — skip step
        setActiveStepIndex((i) => i + 1);
      }
    };
    attempt();
  }, []);

  // When step changes, measure the new target element
  useEffect(() => {
    if (!activeStep) return;
    measureTarget(activeStep.selector);
  }, [activeStep, measureTarget]);

  // Set up MutationObserver for auto-advance steps (prep tour)
  useEffect(() => {
    mutationObserverRef.current?.disconnect();
    if (!activeStep?.autoAdvanceWhenSelector) return;

    const advanceSelector = activeStep.autoAdvanceWhenSelector;
    const observer = new MutationObserver(() => {
      if (document.querySelector(advanceSelector)) {
        observer.disconnect();
        setActiveStepIndex((i) => i + 1);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    mutationObserverRef.current = observer;

    return () => observer.disconnect();
  }, [activeStep]);

  // Lock body scroll while tour is active
  useEffect(() => {
    if (activeTourId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeTourId]);

  const shouldAutoStart = useCallback(
    (tourId: TourId) => !isLoadingTours && !toursCompleted[tourId],
    [isLoadingTours, toursCompleted]
  );

  const startTour = useCallback((tourId: TourId) => {
    setActiveTourId(tourId);
    setActiveStepIndex(0);
    setTargetRect(null);
  }, []);

  const endTour = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    mutationObserverRef.current?.disconnect();
    setActiveTourId(null);
    setTargetRect(null);
  }, []);

  const completeTour = useCallback(() => {
    if (!activeTourId) return;
    completeMutation.mutate(activeTourId);
    endTour();
  }, [activeTourId, completeMutation, endTour]);

  const resetTour = useCallback((tourId: TourId) => {
    resetMutation.mutate(tourId);
  }, [resetMutation]);

  const nextStep = useCallback(() => {
    if (!activeConfig) return;
    if (activeStepIndex < activeConfig.steps.length - 1) {
      setActiveStepIndex((i) => i + 1);
    } else {
      completeTour();
    }
  }, [activeConfig, activeStepIndex, completeTour]);

  return (
    <TourContext.Provider
      value={{
        toursCompleted,
        isLoadingTours,
        activeTourId,
        activeStepIndex,
        activeStep,
        totalSteps,
        targetRect,
        shouldAutoStart,
        startTour,
        nextStep,
        endTour,
        completeTour,
        resetTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export const useTourContext = () => useContext(TourContext);
```

- [ ] **Step 2: Wrap routes with TourProvider in `client/src/App.tsx`**

Import after the existing imports:
```typescript
import { TourProvider } from './context/TourContext';
```

Wrap the contents of `<BrowserRouter>` (i.e. the `<Routes>...</Routes>` block) with `<TourProvider>`:

```tsx
<BrowserRouter>
  <TourProvider>
    <Routes>
      {/* ... existing routes unchanged ... */}
    </Routes>
  </TourProvider>
</BrowserRouter>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/context/TourContext.tsx client/src/App.tsx
git commit -m "feat: add TourContext with server-synced tour state"
```

---

## Task 4: TourOverlay + TakeTourButton

**Files:**
- Create: `client/src/components/tour/TourOverlay.tsx`
- Create: `client/src/components/tour/TakeTourButton.tsx`
- Modify: `client/src/hooks/useTour.ts` (create)
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create `client/src/hooks/useTour.ts`**

```typescript
import { useEffect, useRef } from 'react';
import { useTourContext } from '../context/TourContext';
import type { TourId } from '../api/tours';

export function useTour(tourId: TourId) {
  const ctx = useTourContext();
  const { shouldAutoStart, startTour } = ctx;
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-fire
    if (startedRef.current) return;
    if (shouldAutoStart(tourId)) {
      startedRef.current = true;
      startTour(tourId);
    }
  }, [shouldAutoStart, tourId, startTour]);

  return {
    ...ctx,
    startTour: () => startTour(tourId),
  };
}
```

- [ ] **Step 2: Create `client/src/components/tour/TourOverlay.tsx`**

```typescript
import { createPortal } from 'react-dom';
import { useTourContext } from '../../context/TourContext';

const PADDING = 10;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 160; // approximate, used for position calc

function computeTooltipStyle(
  rect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right'
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number, left: number;

  if (placement === 'bottom') {
    top = rect.bottom + PADDING + 8;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'top') {
    top = rect.top - TOOLTIP_HEIGHT - PADDING - 8;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.left - TOOLTIP_WIDTH - PADDING - 8;
  } else {
    // right
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.right + PADDING + 8;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_HEIGHT - 12));

  return { position: 'fixed', top, left, width: TOOLTIP_WIDTH };
}

export function TourOverlay() {
  const {
    activeTourId,
    activeStep,
    activeStepIndex,
    totalSteps,
    targetRect,
    nextStep,
    endTour,
  } = useTourContext();

  if (!activeTourId || !activeStep || !targetRect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isLastStep = activeStepIndex === totalSteps - 1;

  const spotX = targetRect.left - PADDING;
  const spotY = targetRect.top - PADDING;
  const spotW = targetRect.width + PADDING * 2;
  const spotH = targetRect.height + PADDING * 2;

  const tooltipStyle = computeTooltipStyle(targetRect, activeStep.placement);

  return createPortal(
    <>
      {/* Dimmed backdrop with SVG cutout spotlight */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 60, width: vw, height: vh }}
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width={vw} height={vh} fill="white" />
            <rect
              x={spotX}
              y={spotY}
              width={spotW}
              height={spotH}
              rx={8}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Blue highlight ring around spotlit element */}
      <div
        className="fixed pointer-events-none rounded-lg"
        style={{
          zIndex: 61,
          top: spotY,
          left: spotX,
          width: spotW,
          height: spotH,
          border: '2px solid #3b82f6',
          boxShadow: '0 0 0 2px rgba(59,130,246,0.3)',
        }}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-5 pointer-events-auto"
        style={{ ...tooltipStyle, zIndex: 62 }}
        role="dialog"
        aria-label={activeStep.title}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{activeStep.title}</h3>
          <button
            onClick={endTour}
            className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            aria-label="Skip tour"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-4">{activeStep.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {activeStepIndex + 1} / {totalSteps}
          </span>
          <div className="flex gap-2">
            <button
              onClick={endTour}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
            >
              Skip
            </button>
            <button
              onClick={nextStep}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              {isLastStep ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Click-blocking backdrop (prevents interacting with page behind overlay) */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 59, cursor: 'default' }}
        onClick={endTour}
        aria-hidden="true"
      />
    </>,
    document.body
  );
}
```

- [ ] **Step 3: Create `client/src/components/tour/TakeTourButton.tsx`**

```typescript
import { useTourContext } from '../../context/TourContext';
import type { TourId } from '../../api/tours';

interface Props {
  tourId: TourId;
  className?: string;
}

export function TakeTourButton({ tourId, className }: Props) {
  const { startTour, resetTour } = useTourContext();

  const handleClick = () => {
    resetTour(tourId);
    startTour(tourId);
  };

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        'text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2'
      }
    >
      Take a tour
    </button>
  );
}
```

- [ ] **Step 4: Add `<TourOverlay />` to `client/src/components/layout/AppLayout.tsx`**

Add import:
```typescript
import { TourOverlay } from '../tour/TourOverlay';
```

Add `<TourOverlay />` as the last child before the closing `</div>` of the outermost `<div className="flex min-h-screen bg-gray-50">`, after `<ToastContainer />`:
```tsx
      <ToastContainer />
      <TourOverlay />
    </div>
```

- [ ] **Step 5: Verify TypeScript + dev server start**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/useTour.ts client/src/components/tour/ client/src/components/layout/AppLayout.tsx
git commit -m "feat: add TourOverlay and TakeTourButton components"
```

---

## Task 5: Jobs List Page Tour

**Files:**
- Modify: `client/src/pages/JobTrackerPage.tsx`

The Add Job button is at line 322. The `addOpen` state controls the Add Job modal. When the modal opens while the jobs-list tour is active, we mark the tour complete (the user did what the tour asked).

- [ ] **Step 1: Add `data-tour` attribute to the Add Job button (line 322)**

Change:
```tsx
<Button onClick={openAdd}><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
```
To:
```tsx
<Button onClick={openAdd} data-tour="add-job-btn"><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
```

- [ ] **Step 2: Import `useTour`, `TakeTourButton`, and `useTourContext` at top of file**

Add to imports:
```typescript
import { useTour } from '../hooks/useTour';
import { TakeTourButton } from '../components/tour/TakeTourButton';
import { useTourContext } from '../context/TourContext';
```

- [ ] **Step 3: Call `useTour` and set up the modal-open stop condition**

Inside `JobTrackerPage` component body, after the existing state declarations, add:

```typescript
useTour('jobs-list');
const { activeTourId, completeTour } = useTourContext();

// When the Add Job modal opens while the tour is active, complete the tour
useEffect(() => {
  if (addOpen && activeTourId === 'jobs-list') {
    completeTour();
  }
}, [addOpen, activeTourId, completeTour]);
```

- [ ] **Step 4: Add `<TakeTourButton>` to the page header**

In the header button group (line 318–323), add the button before the Statuses button:

```tsx
<div className="flex gap-2 flex-shrink-0">
  <TakeTourButton tourId="jobs-list" />
  <Button variant="secondary" onClick={() => setManageOpen(true)}>
    <Settings size={15} /> <span className="hidden sm:inline">Statuses</span>
  </Button>
  <Button onClick={openAdd} data-tour="add-job-btn"><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
</div>
```

- [ ] **Step 5: Verify the tour works end-to-end**

Start the dev server (`npm run dev`), log in, navigate to `/jobs`. On first visit the tour should auto-trigger, spotlighting the "Add Job" button. Click "Add Job" — modal opens, overlay disappears. Navigate away and back — tour should NOT re-trigger. Click "Take a tour" — tour restarts.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/JobTrackerPage.tsx
git commit -m "feat: wire jobs-list tour into JobTrackerPage"
```

---

## Task 6: Job Detail Page Tour

**Files:**
- Modify: `client/src/pages/JobDetailPage.tsx`

The seven cards to spotlight are at:
- Line 178: Job Description card `<div>`
- Line 191: Fit Analysis card `<div>` (conditionally rendered)
- Line 230: Interview Prep `<Link>`
- Line 241: Notes card `<div>`
- Line 251: Status card `<div>`
- Line 260: Resume card `<div>`
- Line 365: Cover Letter card `<div>`

- [ ] **Step 1: Add imports**

```typescript
import { useTour } from '../hooks/useTour';
import { TakeTourButton } from '../components/tour/TakeTourButton';
```

- [ ] **Step 2: Call `useTour` inside `JobDetailPage`**

After the existing state declarations, add:
```typescript
useTour('job-detail');
```

- [ ] **Step 3: Add `data-tour="job-description"` to the Job Description card**

Line 178:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="job-description">
```

- [ ] **Step 4: Add `data-tour="fit-analysis"` to the Fit Analysis card**

Line 191 (inside the `job.fitAnalysis &&` block):
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="fit-analysis">
```

Note: This card only renders when `job.fitAnalysis` exists. The `TourContext.measureTarget` written in Task 3 already handles this — it retries up to 10 times, then automatically skips to the next step if the element is never found.

- [ ] **Step 5: Add `data-tour="interview-prep-link"` to the Interview Prep link**

Line 230:
```tsx
<Link
  to={`/jobs/${job.id}/prep`}
  className="flex items-center justify-between bg-white rounded-xl border shadow-sm p-5 hover:border-blue-300 transition-colors group"
  data-tour="interview-prep-link"
>
```

- [ ] **Step 6: Add `data-tour="job-notes"` to the Notes card**

Line 241:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="job-notes">
```

- [ ] **Step 7: Add `data-tour="job-status"` to the Status card**

Line 251:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="job-status">
```

- [ ] **Step 8: Add `data-tour="job-resume"` to the Resume card**

Line 260:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="job-resume">
```

- [ ] **Step 9: Add `data-tour="job-cover-letter"` to the Cover Letter card**

Line 365:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="job-cover-letter">
```

- [ ] **Step 10: Add `<TakeTourButton>` to the header**

In the header (line 171), alongside the Edit button:
```tsx
<div className="flex items-center gap-2">
  <TakeTourButton tourId="job-detail" />
  <Button variant="secondary" size="sm" onClick={openEdit}>
    <Pencil size={14} /> Edit
  </Button>
</div>
```

- [ ] **Step 11: Verify the tour works**

Navigate to any `/jobs/:id` page. Tour should auto-trigger on first visit, cycling through all 7 sections (skipping Fit Analysis if absent). "Take a tour" button replays it.

- [ ] **Step 12: Commit**

```bash
git add client/src/pages/JobDetailPage.tsx client/src/context/TourContext.tsx
git commit -m "feat: wire job-detail tour into JobDetailPage"
```

---

## Task 7: Interview Prep Page Tour

**Files:**
- Modify: `client/src/components/jobs/InterviewPrepPanel.tsx`

The prep tour uses a `MutationObserver` (set up inside `TourContext`) to auto-advance from step 1 (prepare-btn) to step 2 (category-selector) when the `InterviewCategorySelector` mounts.

- [ ] **Step 1: Add imports**

```typescript
import { useTour } from '../../hooks/useTour';
import { TakeTourButton } from '../tour/TakeTourButton';
```

- [ ] **Step 2: Call `useTour` inside `InterviewPrepPanel`**

After the existing state/query declarations, add:
```typescript
useTour('job-prep');
```

- [ ] **Step 3: Add `data-tour="prep-panel"` to the outer container**

Line 69:
```tsx
<div className="bg-white rounded-xl border shadow-sm p-5" data-tour="prep-panel">
```

- [ ] **Step 4: Add `data-tour="prepare-btn"` to the "Prepare for Interview" button**

Line 91–97:
```tsx
<button
  onClick={handleStartPrep}
  disabled={loadingCategories}
  data-tour="prepare-btn"
  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {loadingCategories ? 'Analyzing job…' : 'Prepare for Interview'}
</button>
```

- [ ] **Step 5: Wrap `<InterviewCategorySelector>` in a `data-tour` div**

Line 101–106, change:
```tsx
) : step === 'selecting' ? (
  <InterviewCategorySelector
    categories={suggestedCategories}
    onGenerate={handleGenerate}
    generating={generatingQuestions}
  />
```
To:
```tsx
) : step === 'selecting' ? (
  <div data-tour="category-selector">
    <InterviewCategorySelector
      categories={suggestedCategories}
      onGenerate={handleGenerate}
      generating={generatingQuestions}
    />
  </div>
```

- [ ] **Step 6: Add `<TakeTourButton>` to the panel header**

The header is at line 70–73. Add the button right-aligned:
```tsx
<div className="flex items-center gap-2 mb-4">
  <Briefcase className="h-5 w-5 text-blue-600" />
  <h2 className="text-base font-semibold text-gray-900">Interview Prep</h2>
  <div className="ml-auto">
    <TakeTourButton tourId="job-prep" />
  </div>
</div>
```

- [ ] **Step 7: Verify the full prep tour flow**

Navigate to `/jobs/:id/prep`. Tour should:
1. Spotlight the entire panel (step 1)
2. Click Next → spotlight "Prepare for Interview" button (step 2, with `autoAdvanceWhenSelector`)
3. Click the "Prepare for Interview" button → when `[data-tour="category-selector"]` appears in the DOM, tour auto-advances to step 3
4. Step 3 spotlights the category selector
5. Click Done → tour ends, marked complete server-side

- [ ] **Step 8: Commit**

```bash
git add client/src/components/jobs/InterviewPrepPanel.tsx
git commit -m "feat: wire job-prep tour into InterviewPrepPanel"
```

---

## Task 8: Z-index Audit + Visual Polish

The existing app z-index stack:
- `z-20` — mobile top bar
- `z-30` — mobile sidebar backdrop
- `z-40` — sidebar
- `z-50` — Modal

Tour overlay uses `z-59` (click-blocker), `z-60` (SVG backdrop), `z-61` (highlight ring), `z-62` (tooltip). This sits safely above all existing layers.

- [ ] **Step 1: Verify modal doesn't conflict with tour**

Open a job, trigger the job-detail tour, then verify that if you click Skip, the page is fully interactive again. Open a modal — it should render at `z-50` with no ghost overlay.

- [ ] **Step 2: Verify mobile layout**

On a narrow viewport (< 768px), check that the tour tooltip stays within viewport bounds (clamping in `computeTooltipStyle` handles this). Check that the mobile top bar (`z-20`) is covered by the tour overlay (`z-60`).

- [ ] **Step 3: Final TypeScript check**

```bash
cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit
cd /Users/johnathanwong/Desktop/resume-app/server && npx tsc --noEmit
```

Expected: No errors in either package.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: guided onboarding tour — complete implementation"
```
