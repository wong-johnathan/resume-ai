# Chrome Extension — Save Job to Profile

**Date:** 2026-03-29
**Status:** Approved

## Overview

A Chrome extension that lets users save a job listing from any job portal page (LinkedIn, Indeed, Seek, or any URL) directly into their resume-app account with one click. The server uses Claude AI to extract structured job data from raw page text, then creates a `JobApplication` record tied to the user's account.

No resume tailoring happens at save time. The job lands in the tracker with status `SAVED`, ready for the user to act on later in the web app.

---

## Architecture

Three pieces:

1. **Chrome Extension** — new `extension/` package at the monorepo root
2. **New server route** — `POST /api/external/jobs`
3. **CORS update** — whitelist the extension origin in `app.ts`

---

## Chrome Extension (`extension/`)

Manifest V3 extension. Not added to npm workspaces (no shared dependencies needed).

### Files

```
extension/
├── manifest.json       # MV3 manifest
├── background.js       # Service worker: handles toolbar click, calls API
├── content.js          # Injected on all pages: extracts page text on request
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### `manifest.json`

- `manifest_version: 3`
- `permissions`: `activeTab`, `scripting`, `notifications`
- `host_permissions`: the resume-app server URL (production + localhost)
- `background.service_worker`: `background.js`
- `action`: toolbar button with icons

### `content.js`

Injected into all pages via `scripting.executeScript` on toolbar click (not declared in manifest `content_scripts` — injected on demand to avoid unnecessary overhead).

Responds to a `GET_PAGE_TEXT` message from the background service worker:

```js
{ pageText: document.body.innerText, pageUrl: window.location.href }
```

### `background.js`

Handles `chrome.action.onClicked`:

1. Gets the active tab
2. Injects `content.js` via `chrome.scripting.executeScript`
3. Sends `GET_PAGE_TEXT` message to the tab
4. Receives `{ pageText, pageUrl }`
5. Sends `POST /api/external/jobs` with JSON body, credentials: `'include'` (sends session cookie)
6. On success: shows ✓ badge (`chrome.action.setBadgeText`) for 3 seconds
7. On error: shows `chrome.notifications` with an appropriate message

### Error messages shown to user

| Condition | Message |
|---|---|
| 401 Unauthorized | "Please log in to the app first" |
| 422 Unprocessable | "Couldn't detect a job on this page" |
| Network/other error | "Something went wrong, try again" |

---

## Server Route — `POST /api/external/jobs`

New file: `server/src/routes/external.ts`
Mounted at: `app.use('/api/external', externalRouter)`

### Request

```json
{
  "pageText": "string (raw visible text from job page)",
  "pageUrl": "string (URL of the job page)"
}
```

### Behaviour

1. Validate body with Zod: `pageText` required string, `pageUrl` required URL string
2. Pass `pageText` to a new Claude service function `extractJobFromText(pageText, pageUrl)`
3. Claude returns structured JSON: `{ company, jobTitle, location, salary, description, jobUrl }`
4. If Claude cannot identify a job (confidence too low), throw a 422
5. Create `JobApplication` via Prisma with `status: 'SAVED'` and `userId` from session
6. Create associated `JobOutput` record (same pattern as `POST /api/jobs`)
7. Log activity: `ActivityAction.JOB_CREATED`
8. Return 201 with created job

### Middleware

- `requireAuth` — 401 if not logged in
- `requireSubscription` — same gate as `POST /api/jobs`
- `validateBody(externalJobSchema)` — Zod validation

### Claude prompt (`extractJobFromText`)

New function in `server/src/services/claude.ts`:

```
Extract job posting details from the following webpage text.
Return ONLY a JSON object with these fields:
- company (string)
- jobTitle (string)
- location (string or null)
- salary (string or null)
- description (string — the full job description)
- jobUrl (string — use the provided URL)

If this page does not appear to be a job posting, return: { "isJobPosting": false }

Page URL: <url>
Page text:
<text>
```

If response contains `isJobPosting: false`, route returns 422.

---

## CORS Update

In `server/src/app.ts`, add the extension origin to the CORS allowed origins list alongside `CLIENT_URL` and `ADMIN_URL`.

Add env var: `EXTENSION_ORIGIN` (e.g. `chrome-extension://abcdefghijklmnop`)

The extension ID is fixed once loaded unpacked. If published to the Chrome Web Store, update this env var once — the ID stabilises after first publish.

---

## Data Flow Summary

```
User clicks toolbar button
  → background.js injects content.js into active tab
  → content.js returns { pageText, pageUrl }
  → background.js POST /api/external/jobs { pageText, pageUrl }
      (session cookie sent automatically)
  → server: Claude extracts job fields
  → server: creates JobApplication (status: SAVED) + JobOutput
  → 201 response
  → extension shows ✓ badge for 3s
```

---

## Out of Scope

- Resume tailoring at save time
- Cover letter generation at save time
- Editing fields before saving (no review popup — one-click save)
- Publishing to Chrome Web Store
- Firefox / other browser support
- Duplicate detection (saving same job twice is allowed)
