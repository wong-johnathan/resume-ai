# Client CLAUDE.md

Main user-facing React SPA. Vite + React 18 + TypeScript + TailwindCSS.

## Commands

```bash
npm run dev:client        # Start Vite dev server (port 5173, proxies /api → localhost:3000)
npm run build             # Build to dist/ (via root build script)
```

No test suite.

## Entry Points

- `src/main.tsx` — React DOM mount, wraps app in providers
- `src/App.tsx` — React Router v7 route tree (public + protected)

## Directory Structure

```
client/src/
├── api/
│   ├── client.ts         # Axios instance: baseURL=/api, withCredentials: true
│   ├── auth.ts           # getMe(), logout()
│   ├── profile.ts        # getProfile(), updateProfile(), uploadPdf(), parsePdf()
│   ├── resumes.ts        # CRUD, downloadPdf(), publishResume()
│   ├── jobs.ts           # CRUD job applications, updateStatus()
│   ├── jobStatuses.ts    # CRUD custom status labels
│   ├── ai.ts             # tailorResume(), streamCoverLetter(), generateInterviewPrep(), improveSummary()
│   ├── templates.ts      # listTemplates(), getTemplatePreview()
│   ├── interviewPrep.ts  # generatePrep(), submitAnswer(), getAnswerFeedback()
│   └── tours.ts          # markTourComplete(tourId)
├── context/
│   ├── AuthContext.tsx   # Fetches /api/auth/me on mount; provides useAuth() → { user, loading, refetch }
│   └── TourContext.tsx   # Tour state and completion tracking
├── hooks/
│   ├── useProfile.ts     # React Query hook: fetches and caches the user's profile
│   └── useTour.ts        # Thin wrapper around TourContext
├── store/
│   └── useAppStore.ts    # Zustand store: sidebarOpen (bool) + toasts (array)
├── types/
│   ├── index.ts          # Shared TypeScript types (User, Profile, Resume, Job, etc.)
│   └── resumeContent.ts  # Type for Resume.contentJson structure
├── pages/
│   ├── LoginPage.tsx          # OAuth buttons (public)
│   ├── SetupPage.tsx          # Initial profile creation (no ProfileGate)
│   ├── DashboardPage.tsx      # Overview: stats, quick links
│   ├── ProfilePage.tsx        # Edit profile + experiences, educations, skills, certifications
│   ├── TemplatesPage.tsx      # Browse + select from 20 resume templates
│   ├── ResumeDetailPage.tsx   # View resume, download PDF
│   ├── ResumeEditPage.tsx     # Edit resume contentJson with TipTap rich-text sections
│   ├── JobTrackerPage.tsx     # Table of job applications; status dropdown per row
│   └── JobDetailPage.tsx      # Job detail: cover letter, tailor resume, interview prep, sample job
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx      # Main shell: sidebar + header + <Outlet>
│   │   ├── ProtectedRoute.tsx # Redirects to /login if not authenticated
│   │   ├── ProfileGate.tsx    # Redirects to /setup if no profile
│   │   └── Sidebar.tsx        # Nav menu with links
│   ├── jobs/
│   │   ├── JobOutputEditor.tsx          # Displays tailored resume change diffs
│   │   ├── ExportModal.tsx              # Export resume + cover letter
│   │   ├── CoverLetterExportModal.tsx
│   │   ├── SampleJobModal.tsx           # Generate a sample job from profile
│   │   ├── InterviewPrepPanel.tsx       # Category/question selector
│   │   ├── InterviewQuestionsView.tsx   # Q&A display + answer submission
│   │   ├── InterviewAnswerPanel.tsx     # Answer feedback UI
│   │   ├── InterviewCategorySelector.tsx
│   │   ├── FitScoreDonut.tsx            # Donut chart for job fit score
│   │   └── StatusTimeline.tsx           # Status change audit trail
│   ├── profile/                         # Profile form section components
│   ├── tour/
│   │   ├── TakeTourButton.tsx
│   │   └── TourOverlay.tsx              # Step-by-step overlay UI
│   └── ui/
│       ├── Badge.tsx, Button.tsx, Input.tsx, Modal.tsx
│       ├── RichTextEditor.tsx           # TipTap wrapper
│       ├── Select.tsx, Skeleton.tsx, Textarea.tsx, Toast.tsx
└── tours/
    ├── index.ts              # Tour registry
    ├── types.ts              # Tour step shape
    └── configs/
        ├── jobsListTour.ts   # Tour: jobs-list
        ├── jobDetailTour.ts  # Tour: job-detail
        └── jobPrepTour.ts    # Tour: job-prep
```

## Routing

```
/                        → LoginPage (public)
/login                   → Redirects to /
/setup                   → SetupPage (auth required, no profile required)
/dashboard               → DashboardPage (auth + profile required)
/profile                 → ProfilePage
/templates               → TemplatesPage
/resumes/:id             → ResumeDetailPage
/resumes/:id/edit        → ResumeEditPage
/jobs                    → JobTrackerPage
/jobs/:id                → JobDetailPage
/jobs/:id/prep           → Redirects to /jobs/:id?tab=prep
```

All routes except `/` and `/login` are wrapped in `<ProtectedRoute>`. All routes except `/setup` are also wrapped in `<ProfileGate>`.

## Key Patterns

### Auth State
`AuthContext` fetches `/api/auth/me` on mount. Everywhere in the app:
```typescript
const { user, loading } = useAuth();
```

### Server State
React Query (`@tanstack/react-query`) for all server data. Example:
```typescript
const { data, isLoading } = useProfile(); // src/hooks/useProfile.ts
```

### UI State
Zustand (`useAppStore`) for sidebar and toasts only — don't put server state here:
```typescript
const { addToast } = useAppStore();
addToast({ message: 'Saved!', type: 'success' });
```

### API Layer
Always call through `src/api/` wrappers, never use the Axios instance directly in components:
```typescript
import { updateProfile } from '../api/profile';
await updateProfile(data);
```

### Forms
React Hook Form + Zod:
```typescript
const schema = z.object({ title: z.string().min(1) });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Cover Letter SSE Streaming
`streamCoverLetter()` in `src/api/ai.ts` uses `EventSource`/`fetch` with SSE. The component reads chunks and updates state incrementally, saving the final text when the stream closes.

### Toasts
Use `useAppStore().addToast()` for user feedback — always prefer this over `alert()`.

## Styling

TailwindCSS utility classes. Lucide icons (`lucide-react`). No component library — all UI primitives are in `src/components/ui/`.

## Tours

Three onboarding tours: `jobs-list`, `job-detail`, `job-prep`. Each is defined in `src/tours/configs/`. Completion is persisted server-side via `PATCH /api/tours/:tourId` and tracked in `Profile.toursCompleted`.

## Environment Variables

Copy `client/.env.example` → `client/.env`.

| Variable | Purpose |
|---|---|
| `VITE_APP_TITLE` | Optional app title override |

The client has no secrets — the `/api` proxy in `vite.config.ts` handles routing to the server.
