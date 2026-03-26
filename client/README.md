# Client

Main user-facing React SPA for Resume AI. Build and manage resumes, track job applications, use AI to tailor resumes and generate cover letters, and prepare for interviews.

> Part of the [resume-app](../README.md) monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite + TypeScript |
| UI | React 18, TailwindCSS, Lucide icons |
| Routing | React Router v7 |
| Server state | TanStack Query (React Query) |
| UI state | Zustand |
| Forms | React Hook Form + Zod |
| Rich text | TipTap editor |
| HTTP | Axios (`baseURL=/api`, `withCredentials: true`) |

## Getting Started

### Prerequisites

- Node.js 20+
- Server running on port 3000 (see [server/README.md](../server/README.md))

### Run

```bash
# From the repo root
npm run dev:client
```

Opens on [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` → `http://localhost:3000`.

No `.env` secrets required — the client has no sensitive configuration.

## Routes

| Path | Auth | Profile | Description |
|---|---|---|---|
| `/` | — | — | Login page (Google OAuth) |
| `/login` | — | — | Redirects to `/` |
| `/setup` | Required | — | Initial profile creation |
| `/dashboard` | Required | Required | Overview + quick links |
| `/profile` | Required | Required | Edit profile, experiences, education, skills |
| `/templates` | Required | Required | Browse + select resume templates |
| `/resumes/:id` | Required | Required | View resume, download PDF |
| `/resumes/:id/edit` | Required | Required | Edit resume with TipTap rich-text editor |
| `/jobs` | Required | Required | Job application table |
| `/jobs/:id` | Required | Required | Job detail: cover letter, tailor, interview prep |

**Auth guard:** `<ProtectedRoute>` redirects unauthenticated users to `/`.
**Profile guard:** `<ProfileGate>` redirects users without a profile to `/setup`.

## Architecture

```
client/src/
├── api/
│   ├── client.ts         # Axios instance — import this, never create a new one
│   ├── auth.ts           # getMe(), logout()
│   ├── profile.ts        # Profile + experiences/education/skills/certifications
│   ├── resumes.ts        # Resume CRUD, PDF download
│   ├── jobs.ts           # Job application CRUD
│   ├── jobStatuses.ts    # Custom status CRUD
│   ├── ai.ts             # tailorResume(), streamCoverLetter(), improveSummary()
│   ├── templates.ts      # listTemplates(), getPreview()
│   ├── interviewPrep.ts  # generatePrep(), submitAnswer(), getAnswerFeedback()
│   └── tours.ts          # markTourComplete(tourId)
├── context/
│   ├── AuthContext.tsx   # Fetches /api/auth/me on mount; useAuth() → { user, loading }
│   └── TourContext.tsx   # Tour state + completion logic
├── hooks/
│   ├── useProfile.ts     # React Query hook for user profile
│   └── useTour.ts        # Wrapper around TourContext
├── store/
│   └── useAppStore.ts    # Zustand: sidebarOpen + toasts
├── types/
│   ├── index.ts          # All shared TypeScript types
│   └── resumeContent.ts  # Resume.contentJson type definition
├── pages/
│   ├── LoginPage.tsx
│   ├── SetupPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── TemplatesPage.tsx
│   ├── ResumeDetailPage.tsx
│   ├── ResumeEditPage.tsx
│   ├── JobTrackerPage.tsx
│   └── JobDetailPage.tsx
├── components/
│   ├── layout/           # AppLayout, Sidebar, ProtectedRoute, ProfileGate
│   ├── jobs/             # Cover letter, interview prep, fit score, export
│   ├── profile/          # Profile form sections
│   ├── tour/             # TourOverlay, TakeTourButton
│   └── ui/               # Button, Input, Modal, Toast, RichTextEditor, etc.
└── tours/
    ├── index.ts          # Tour registry
    ├── types.ts          # Tour step shape
    └── configs/          # jobsListTour, jobDetailTour, jobPrepTour
```

## Key Patterns

### Auth state
```typescript
import { useAuth } from '../context/AuthContext';
const { user, loading } = useAuth();
```

### Server state (React Query)
```typescript
import { useProfile } from '../hooks/useProfile';
const { data: profile, isLoading } = useProfile();
```

### UI state (Zustand)
```typescript
import { useAppStore } from '../store/useAppStore';
const { addToast } = useAppStore();
addToast({ message: 'Saved!', type: 'success' });
```

### API calls
Always call through `src/api/` wrappers — never use the Axios instance directly in components:
```typescript
import { updateProfile } from '../api/profile';
await updateProfile(data);
```

### Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ title: z.string().min(1) });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Toasts
```typescript
const { addToast } = useAppStore();
addToast({ message: 'Resume saved', type: 'success' });
addToast({ message: 'Something went wrong', type: 'error' });
```

## Tours

Three onboarding tours guide new users through the app:

| Tour ID | Page | Trigger |
|---|---|---|
| `jobs-list` | `/jobs` | First visit to job tracker |
| `job-detail` | `/jobs/:id` | First visit to a job detail page |
| `job-prep` | `/jobs/:id?tab=prep` | First visit to interview prep tab |

Completion is persisted server-side via `PATCH /api/tours/:tourId` and stored in `Profile.toursCompleted` (JSON map of tourId → ISO timestamp). Tour configs live in `src/tours/configs/`.
