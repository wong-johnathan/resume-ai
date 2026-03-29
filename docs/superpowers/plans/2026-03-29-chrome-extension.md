# Chrome Extension — Save Job to Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that saves a job listing from any webpage to the user's resume-app account with one click, using Claude AI to extract structured job data from the page's visible text.

**Architecture:** The extension injects a content script to capture `document.body.innerText`, sends it to a new `POST /api/external/jobs` server route via the background service worker (using the existing session cookie), and Claude parses the raw text into structured job fields before creating the `JobApplication` record.

**Tech Stack:** Chrome Extension MV3 (vanilla JS, no build step), Express + Zod + Prisma on the server, OpenAI SDK pointed at Claude models.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `server/src/config/env.ts` | Modify | Add optional `EXTENSION_ORIGIN` env var |
| `server/.env.example` | Modify | Document `EXTENSION_ORIGIN` |
| `server/src/services/claude.ts` | Modify | Add `extractJobFromText()` function |
| `server/src/routes/external.ts` | Create | `POST /api/external/jobs` route |
| `server/src/app.ts` | Modify | CORS update + mount external router |
| `extension/manifest.json` | Create | MV3 manifest |
| `extension/content.js` | Create | Page text extractor (runs in tab context) |
| `extension/background.js` | Create | Toolbar click handler + API caller |

---

## Task 1: Add EXTENSION_ORIGIN env var

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Add `EXTENSION_ORIGIN` to env schema**

In `server/src/config/env.ts`, add one line inside the `envSchema` object after the `ADMIN_URL` line:

```typescript
  EXTENSION_ORIGIN: z.string().optional(),
```

The full object should now include:
```typescript
  ADMIN_URL: z.string().optional(),
  EXTENSION_ORIGIN: z.string().optional(),
```

- [ ] **Step 2: Document the env var in `.env.example`**

In `server/.env.example`, add after the `ADMIN_URL=` line:

```
# Chrome Extension origin (e.g. chrome-extension://abcdefghijklmnopabcdefghijklmnop)
# Get the extension ID from chrome://extensions after loading unpacked.
EXTENSION_ORIGIN=
```

- [ ] **Step 3: Commit**

```bash
git add server/src/config/env.ts server/.env.example
git commit -m "feat: add EXTENSION_ORIGIN env var for Chrome extension CORS"
```

---

## Task 2: Add extractJobFromText service function

**Files:**
- Modify: `server/src/services/claude.ts`

- [ ] **Step 1: Add the exported interface and function at the end of `server/src/services/claude.ts`**

```typescript
// ─── Job Extraction (Chrome Extension) ───────────────────────────────────────

export interface ExtractedJob {
  company: string;
  jobTitle: string;
  location: string | null;
  salary: string | null;
  description: string;
  jobUrl: string;
}

export async function extractJobFromText(
  pageText: string,
  pageUrl: string
): Promise<ExtractedJob> {
  // Truncate to 8000 chars to keep tokens reasonable
  const truncated = pageText.slice(0, 8000);

  const prompt = `Extract job posting details from the following webpage text.
Return ONLY a JSON object — no markdown fences, no explanation.

If this page is NOT a job posting, return exactly: {"isJobPosting":false}

If it IS a job posting, return:
{
  "isJobPosting": true,
  "company": "Company name (string)",
  "jobTitle": "Job title (string)",
  "location": "Location or null if not found",
  "salary": "Salary range or null if not found",
  "description": "Full job description text (string)",
  "jobUrl": "${pageUrl}"
}

Page URL: ${pageUrl}
Page text:
${truncated}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (!parsed.isJobPosting) {
    throw Object.assign(new Error('Not a job posting'), { code: 'NOT_JOB_POSTING' });
  }

  if (!parsed.company || !parsed.jobTitle || !parsed.description) {
    throw new Error('AI returned incomplete job data');
  }

  return {
    company: parsed.company,
    jobTitle: parsed.jobTitle,
    location: parsed.location ?? null,
    salary: parsed.salary ?? null,
    description: parsed.description,
    jobUrl: parsed.jobUrl ?? pageUrl,
  };
}
```

- [ ] **Step 2: Verify the server still compiles**

```bash
cd /path/to/resume-app && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/claude.ts
git commit -m "feat: add extractJobFromText AI service for Chrome extension"
```

---

## Task 3: Create POST /api/external/jobs route

**Files:**
- Create: `server/src/routes/external.ts`

- [ ] **Step 1: Create the route file**

Create `server/src/routes/external.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';
import { requireSubscription } from '../middleware/requireSubscription';
import { validateBody } from '../middleware/validateBody';
import { logActivity, ActivityAction } from '../services/activityLog';
import { extractJobFromText } from '../services/claude';

const router = Router();
router.use(requireAuth);

const saveJobSchema = z.object({
  pageText: z.string().min(1),
  pageUrl: z.string().url(),
});

router.post('/', requireSubscription, validateBody(saveJobSchema), async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    const { pageText, pageUrl } = req.body;

    let extracted;
    try {
      extracted = await extractJobFromText(pageText, pageUrl);
    } catch (err: any) {
      if (err?.code === 'NOT_JOB_POSTING') {
        return res.status(422).json({ error: 'not_a_job_posting', message: "Couldn't detect a job on this page" });
      }
      return next(err);
    }

    let job: any;
    await prisma.$transaction(async (tx) => {
      job = await tx.jobApplication.create({
        data: {
          userId,
          company: extracted.company,
          jobTitle: extracted.jobTitle,
          jobUrl: extracted.jobUrl,
          description: extracted.description,
          salary: extracted.salary ?? undefined,
          location: extracted.location ?? undefined,
          status: 'SAVED',
        },
      });
      await tx.jobOutput.create({ data: { jobId: job.id, userId } });
    });

    logActivity(userId, ActivityAction.JOB_CREATED, {
      jobId: job.id,
      company: job.company,
      jobTitle: job.jobTitle,
      source: 'chrome_extension',
    }).catch(() => {});

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /path/to/resume-app && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/external.ts
git commit -m "feat: add POST /api/external/jobs route for Chrome extension"
```

---

## Task 4: Mount external router and update CORS in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Import the external router**

In `server/src/app.ts`, add to the import block alongside the other router imports:

```typescript
import externalRouter from './routes/external';
```

- [ ] **Step 2: Add EXTENSION_ORIGIN to allowedOrigins**

Find the CORS block (around line 69):

```typescript
  const allowedOrigins = [env.CLIENT_URL];
  if (env.ADMIN_URL) allowedOrigins.push(env.ADMIN_URL);
```

Replace with:

```typescript
  const allowedOrigins = [env.CLIENT_URL];
  if (env.ADMIN_URL) allowedOrigins.push(env.ADMIN_URL);
  if (env.EXTENSION_ORIGIN) allowedOrigins.push(env.EXTENSION_ORIGIN);
```

- [ ] **Step 3: Mount the external router**

In `server/src/app.ts`, add after the `app.use('/api/billing', billingRouter);` line:

```typescript
  app.use('/api/external', externalRouter);
```

- [ ] **Step 4: Verify the server compiles and starts**

```bash
cd /path/to/resume-app && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Smoke test the new route (unauthenticated → expect 401)**

Start the server with `npm run dev:server`, then in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/external/jobs \
  -H "Content-Type: application/json" \
  -d '{"pageText":"test","pageUrl":"https://example.com"}' | cat
```

Expected response:
```json
{"error":"Unauthorized"}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: mount external router and add extension CORS origin"
```

---

## Task 5: Build Chrome extension manifest and content script

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/content.js`

- [ ] **Step 1: Create the extension directory**

```bash
mkdir -p extension
```

- [ ] **Step 2: Create `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Save Job",
  "version": "1.0.0",
  "description": "Save any job listing to your resume-app account with one click.",
  "permissions": [
    "activeTab",
    "scripting",
    "notifications"
  ],
  "host_permissions": [
    "http://localhost:3000/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Save Job"
  }
}
```

Note: No icons declared — Chrome will show the default puzzle piece icon. Add `extension/icons/` PNG files and an `"icons"` key to the manifest later for a polished look.

- [ ] **Step 3: Create `extension/content.js`**

```js
// Content script — injected on demand by background.js via chrome.scripting.executeScript.
// Responds to a GET_PAGE_TEXT message with the page's visible text and current URL.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_TEXT') {
    sendResponse({
      pageText: document.body.innerText,
      pageUrl: window.location.href,
    });
  }
  return true; // Keep message channel open for async sendResponse
});
```

- [ ] **Step 4: Commit**

```bash
git add extension/
git commit -m "feat: add Chrome extension manifest and content script"
```

---

## Task 6: Build extension background service worker

**Files:**
- Create: `extension/background.js`

- [ ] **Step 1: Create `extension/background.js`**

Replace `SERVER_URL` with your actual deployed server URL before going to production. In development, use `http://localhost:3000`.

```js
const SERVER_URL = 'http://localhost:3000'; // Change to production URL when deploying

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Clear any previous badge
  chrome.action.setBadgeText({ text: '', tabId: tab.id });

  try {
    // Inject content script into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    // Ask content script for page text
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' });
    const { pageText, pageUrl } = response;

    // Call server — session cookie is sent automatically (credentials: 'include')
    const res = await fetch(`${SERVER_URL}/api/external/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pageText, pageUrl }),
    });

    if (res.status === 401) {
      showNotification('Not logged in', 'Please log in to the app first.');
      return;
    }

    if (res.status === 422) {
      showNotification('Not a job page', "Couldn't detect a job on this page.");
      return;
    }

    if (res.status === 402) {
      showNotification('Upgrade required', 'You have reached your job limit. Upgrade to Pro.');
      return;
    }

    if (!res.ok) {
      showNotification('Error', 'Something went wrong, try again.');
      return;
    }

    const job = await res.json();

    // Show success badge for 3 seconds
    chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 3000);

    showNotification('Job saved!', `${job.jobTitle} at ${job.company} added to your tracker.`);
  } catch (err) {
    console.error('[SaveJob] Error:', err);
    showNotification('Error', 'Something went wrong, try again.');
  }
});

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'https://www.google.com/favicon.ico', // Temporary placeholder — replace with extension icon path once icons/ added
    title,
    message,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/background.js
git commit -m "feat: add Chrome extension background service worker"
```

---

## Task 7: Load extension and run end-to-end test

This task is manual — no code changes.

- [ ] **Step 1: Load the extension in Chrome**

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repo
5. The extension should appear with the name "Save Job"

- [ ] **Step 2: Copy the Extension ID**

On the extension card in `chrome://extensions`, copy the **ID** (a 32-character string like `abcdefghijklmnopabcdefghijklmnop`).

- [ ] **Step 3: Set EXTENSION_ORIGIN in server .env**

In `server/.env`, add:

```
EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID_HERE
```

Restart the dev server: `npm run dev:server`

- [ ] **Step 4: Log in to the web app**

Navigate to `http://localhost:5173` and log in with Google. This establishes the `connect.sid` session cookie.

- [ ] **Step 5: Test on a real job page**

Navigate to any job listing (e.g., a LinkedIn job, an Indeed posting, or any company careers page). Click the **Save Job** extension icon in the Chrome toolbar.

Expected:
- A ✓ badge appears on the icon for 3 seconds
- A Chrome notification appears: "Job saved! [Job Title] at [Company] added to your tracker."

- [ ] **Step 6: Verify in the web app**

Navigate to `http://localhost:5173/jobs`. The job should appear at the top of the list with status `SAVED`, correct company, title, and description.

- [ ] **Step 7: Test error cases**

**Not logged in:** Log out of the web app (`http://localhost:5173`), then click the extension on a job page.
Expected notification: "Not logged in — Please log in to the app first."

**Non-job page:** Click the extension while on a non-job page (e.g., `https://google.com`).
Expected notification: "Not a job page — Couldn't detect a job on this page."

- [ ] **Step 8: Push to remote**

```bash
git push
```
