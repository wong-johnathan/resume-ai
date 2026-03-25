# Interview Prep v2 — Custom Categories, Questions & Sample Responses

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add their own categories and questions to their interview prep, generate a standalone AI sample response per question without submitting their own answer, and remove the Regenerate button.

**Architecture:** Three server-side additions (new AI service function, one new AI endpoint, one new CRUD endpoint); four client-side changes (updated types, updated API wrapper, modified InterviewCategorySelector with custom category input, modified InterviewQuestionsView/InterviewAnswerPanel with add-question flow and sample response feature). All data persists via the existing `InterviewPrep.categories` JSON field — questions gain `sampleResponse?: string` and `isCustom?: boolean` fields; categories gain `isCustom?: boolean`.

**Tech Stack:** Same as v1 — Node.js/Express/TypeScript/Prisma/OpenAI SDK, React 18/TypeScript/Tailwind/Lucide icons

**Base commit (start of v2 work):** ea24110

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Modify | `server/src/services/claude.ts` | Add `generateSampleResponse` function |
| Modify | `server/src/routes/ai.ts` | Add `POST /interview-sample-response` endpoint |
| Modify | `server/src/routes/interviewPrep.ts` | Add `PATCH /:jobId/add-question` endpoint |
| Modify | `client/src/types/index.ts` | Add `sampleResponse?` + `isCustom?` to `InterviewQuestion`; add `isCustom?` to `InterviewCategory` |
| Modify | `client/src/api/interviewPrep.ts` | Add `generateSampleResponse` + `addQuestion` functions |
| Modify | `client/src/components/jobs/InterviewCategorySelector.tsx` | Add custom category text input |
| Modify | `client/src/components/jobs/InterviewAnswerPanel.tsx` | Add sample response section + "Generate Sample Response" button |
| Modify | `client/src/components/jobs/InterviewQuestionsView.tsx` | Remove Regenerate button + header, add "Add question" per category, update props |
| Modify | `client/src/components/jobs/InterviewPrepPanel.tsx` | Remove `onRegenerate`/`regenerating` props passed to `InterviewQuestionsView` |

---

## Task 1 — Server: New AI Function + Endpoints

**Files:**
- Modify: `server/src/services/claude.ts`
- Modify: `server/src/routes/ai.ts`
- Modify: `server/src/routes/interviewPrep.ts`

### 1a — Add `generateSampleResponse` to `server/src/services/claude.ts`

Add this function near the other interview prep functions:

```typescript
export async function generateSampleResponse(
  question: string,
  jobDescription: string,
  categoryName: string,
  profile: {
    summary?: string | null;
    experiences: Array<{ title: string; company: string }>;
    skills: Array<{ name: string }>;
  }
): Promise<string> {
  const skillNames = profile.skills.map((s) => s.name).join(', ');
  const recentRoles = profile.experiences
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}`)
    .join('; ');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior interview coach. Generate an ideal sample answer for the given interview question, tailored to the candidate\'s background and the job description. Return a JSON object with a single "sampleResponse" string field. The response should be 3–5 sentences, concrete, and use the STAR method where appropriate.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCategory: ${categoryName}\nQuestion: ${question}\n\nCandidate Skills: ${skillNames}\nRecent Roles: ${recentRoles}\nSummary: ${profile.summary ?? 'N/A'}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
  return typeof parsed.sampleResponse === 'string' ? parsed.sampleResponse : '';
}
```

### 1b — Add `POST /interview-sample-response` to `server/src/routes/ai.ts`

First add `generateSampleResponse` to the import from `'../services/claude'`.

Then add this endpoint after the other interview endpoints:

```typescript
router.post(
  '/interview-sample-response',
  validateBody(
    z.object({
      jobId: z.string(),
      categoryName: z.string().min(1),
      questionIndex: z.number().int().min(0),
      question: z.string().min(1),
    })
  ),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { jobId, categoryName, questionIndex, question } = req.body;

      const job = await prisma.jobApplication.findFirst({
        where: { id: jobId, userId: user.id },
      });
      if (!job || !job.description) {
        return res.status(404).json({ error: 'Job not found or has no description' });
      }

      const profile = await prisma.profile.findFirst({
        where: { userId: user.id },
        include: {
          experiences: { orderBy: { order: 'asc' }, take: 3 },
          skills: { take: 10 },
        },
      });

      const sampleResponse = await generateSampleResponse(
        question,
        job.description,
        categoryName,
        {
          summary: profile?.summary,
          experiences: profile?.experiences ?? [],
          skills: profile?.skills ?? [],
        }
      );

      // Patch sampleResponse into the specific question in the prep record
      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId, userId: user.id },
      });
      if (!prep) {
        return res.status(404).json({ error: 'Interview prep not found' });
      }

      const categories = prep.categories as unknown as InterviewCategory[];
      const category = categories.find((c) => c.name === categoryName);
      if (!category || !category.questions[questionIndex]) {
        return res.status(404).json({ error: 'Question not found' });
      }

      category.questions[questionIndex].sampleResponse = sampleResponse;

      const updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data: { categories: categories as any },
      });

      res.json({ sampleResponse, prep: updated });
    } catch (err) {
      next(err);
    }
  }
);
```

### 1c — Add `PATCH /:jobId/add-question` to `server/src/routes/interviewPrep.ts`

Add this handler alongside the other routes in the file:

```typescript
// PATCH /api/interview-prep/:jobId/add-question
router.patch(
  '/:jobId/add-question',
  validateBody(z.object({ categoryName: z.string().min(1), question: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const user = getUser(req);
      const { categoryName, question } = req.body;

      const prep = await prisma.interviewPrep.findFirst({
        where: { jobId: req.params.jobId as string, userId: user.id },
      });
      if (!prep) return res.status(404).json({ error: 'Interview prep not found' });

      const categories = prep.categories as unknown as InterviewCategory[];
      let category = categories.find((c) => c.name === categoryName);

      if (!category) {
        // Auto-create a new custom category
        category = { name: categoryName, questionCount: 0, questions: [], isCustom: true };
        categories.push(category);
      }

      category.questions.push({ question, isCustom: true });
      category.questionCount = category.questions.length;

      const updated = await prisma.interviewPrep.update({
        where: { id: prep.id },
        data: { categories: categories as any },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
```

> Note: `InterviewCategory` and `InterviewQuestion` types are already imported in `interviewPrep.ts` from `'../services/claude'`. If `isCustom` is not yet on those interfaces, the type cast `as unknown as InterviewCategory[]` allows the extra field — no server type change needed since the field is added on the client types first.

- [ ] Implement 1a, 1b, 1c as described above
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/server && npx tsc --noEmit` — fix all errors
- [ ] Commit:
  ```bash
  git add server/src/services/claude.ts server/src/routes/ai.ts server/src/routes/interviewPrep.ts
  git commit -m "feat: add generateSampleResponse AI function, sample-response endpoint, and add-question CRUD"
  ```

---

## Task 2 — Client: Types + API Wrapper

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/interviewPrep.ts`

### 2a — Update types

In `client/src/types/index.ts`, update `InterviewQuestion` and `InterviewCategory`:

```typescript
export interface InterviewQuestion {
  question: string;
  isCustom?: boolean;        // user-added question
  userAnswer?: string;
  feedback?: InterviewFeedback;
  sampleResponse?: string;   // standalone AI-generated sample (no user answer needed)
}

export interface InterviewCategory {
  name: string;
  questionCount: number;
  questions: InterviewQuestion[];
  isCustom?: boolean;        // user-added category
}
```

### 2b — Add API functions

In `client/src/api/interviewPrep.ts`, add two new exports:

```typescript
export const generateSampleResponse = (payload: {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: string;
}) =>
  api
    .post<{ sampleResponse: string; prep: InterviewPrep }>('/ai/interview-sample-response', payload)
    .then((r) => r.data);

export const addQuestion = (jobId: string, categoryName: string, question: string) =>
  api
    .patch<InterviewPrep>(`/interview-prep/${jobId}/add-question`, { categoryName, question })
    .then((r) => r.data);
```

- [ ] Make both changes
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit` — fix all errors
- [ ] Commit:
  ```bash
  git add client/src/types/index.ts client/src/api/interviewPrep.ts
  git commit -m "feat: add sampleResponse/isCustom fields to types and new API wrapper functions"
  ```

---

## Task 3 — Client: InterviewCategorySelector (custom category input)

**Files:**
- Modify: `client/src/components/jobs/InterviewCategorySelector.tsx`

Read the current file first. Then add a custom category input section **below the category list and above the "Generate Questions" button**.

The UI:
- A text input with placeholder "Add your own category…" and a small "Add" button next to it
- When the user types a name and clicks "Add" (or presses Enter): the category is added to `selections` state (checked by default, count=5) and appended to the rendered list
- If the input is empty or the name already exists, the "Add" button is disabled / the add is a no-op
- Custom-added categories display exactly like AI-suggested ones (same checkbox + count dropdown)
- Track which categories are custom so they can be labelled differently if needed (but visual label is optional — keep it simple)

Implementation sketch:
```typescript
const [customInput, setCustomInput] = useState('');

const handleAddCustom = () => {
  const name = customInput.trim();
  if (!name || selections[name]) return; // empty or already exists
  setSelections((prev) => ({ ...prev, [name]: { checked: true, count: 5 } }));
  setCustomInput('');
};

// In JSX, below the category list div, above the Generate button:
<div className="flex gap-2 pt-2 border-t border-gray-100">
  <input
    type="text"
    value={customInput}
    onChange={(e) => setCustomInput(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
    placeholder="Add your own category…"
    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
  />
  <button
    onClick={handleAddCustom}
    disabled={!customInput.trim() || !!selections[customInput.trim()]}
    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    Add
  </button>
</div>
```

Also note: the `categories` prop only provides AI-suggested names. Custom categories added via the input live in `selections` state only. The `handleGenerate` function already collects all checked entries from `selections`, so custom categories flow through automatically.

- [ ] Read the current file
- [ ] Add `customInput` state and `handleAddCustom` function
- [ ] Add the input+button JSX between the category list and the Generate button
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit`
- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewCategorySelector.tsx
  git commit -m "feat: add custom category input to InterviewCategorySelector"
  ```

---

## Task 4 — Client: InterviewAnswerPanel (sample response feature)

**Files:**
- Modify: `client/src/components/jobs/InterviewAnswerPanel.tsx`

Read the current file first. Then add sample response functionality.

**New state:**
```typescript
const [generatingSample, setGeneratingSample] = useState(false);
```

**New handler:**
```typescript
const handleGenerateSample = async () => {
  setGeneratingSample(true);
  try {
    const { sampleResponse } = await generateSampleResponse({
      jobId,
      categoryName,
      questionIndex,
      question: question.question,
    });
    onSampleGenerated(sampleResponse);
  } catch {
    addToast('Failed to generate sample response. Please try again.', 'error');
  } finally {
    setGeneratingSample(false);
  }
};
```

**New prop:** Add `onSampleGenerated: (sampleResponse: string) => void` to the `Props` interface. This allows the parent to patch the `sampleResponse` into local state (same pattern as `onAnswerSaved`).

**Sample response UI — show above the answer input/feedback sections:**

```tsx
{/* Sample Response */}
<div className="mt-3">
  {question.sampleResponse ? (
    <div className="bg-blue-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Sample Response</span>
        </div>
        <button
          onClick={handleGenerateSample}
          disabled={generatingSample}
          className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
        >
          {generatingSample ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>
      <p className="text-sm text-blue-800 leading-relaxed">{question.sampleResponse}</p>
    </div>
  ) : (
    <button
      onClick={handleGenerateSample}
      disabled={generatingSample}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
    >
      <Lightbulb className="h-4 w-4" />
      {generatingSample ? 'Generating sample…' : 'Generate sample response'}
    </button>
  )}
</div>
```

Import `generateSampleResponse` from `'../../api/interviewPrep'`.

Also import `Lightbulb` from lucide-react — it's already imported in the current file.

Place the sample response section:
- In the **feedback view** (when `hasFeedback`): show it BEFORE the "Your answer" box (at the top of the feedback block), since the sample response is now a standalone feature
- In the **input view** (no feedback): show it ABOVE the textarea

This way users can always see/generate a sample response regardless of which state they're in.

**Remove `sampleResponse` from `InterviewFeedback` display:** The current feedback view shows a "Stronger response" section from `question.feedback.sampleResponse`. Keep that as-is (it's the feedback-specific tailored response). The new standalone `question.sampleResponse` is a separate thing.

- [ ] Read the current file
- [ ] Add `onSampleGenerated` to Props interface
- [ ] Add `generatingSample` state and `handleGenerateSample` handler
- [ ] Add sample response UI above textarea (input state) and above "Your answer" (feedback state)
- [ ] Import `generateSampleResponse` from API
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit`
- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewAnswerPanel.tsx
  git commit -m "feat: add generate sample response button to InterviewAnswerPanel"
  ```

---

## Task 5 — Client: InterviewQuestionsView (remove regenerate, add question per category)

**Files:**
- Modify: `client/src/components/jobs/InterviewQuestionsView.tsx`

Read the current file first. Then make these changes:

### 5a — Remove Regenerate button and top-level header

Remove the entire `<div className="flex items-center justify-between">` block at the top (the one containing `"{answeredCount}/{totalCount} answered"` and the Regenerate button). Also remove `onRegenerate` and `regenerating` from the Props interface and the function signature.

Move the answered/total count into each category badge instead (already done per-category with `catAnswered/cat.questions.length`).

### 5b — Update Props

```typescript
interface Props {
  jobId: string;
  categories: InterviewCategory[];
  // removed: onRegenerate, regenerating
}
```

### 5c — Update `InterviewAnswerPanel` props

Since `InterviewAnswerPanel` now has `onSampleGenerated`, add it to each panel mount:

```tsx
<InterviewAnswerPanel
  jobId={jobId}
  categoryName={cat.name}
  questionIndex={qIndex}
  question={q}
  onAnswerSaved={(feedback, answer) =>
    patchQuestion(cat.name, qIndex, { feedback, userAnswer: answer })
  }
  onCleared={() =>
    patchQuestion(cat.name, qIndex, { feedback: undefined, userAnswer: undefined })
  }
  onSampleGenerated={(sampleResponse) =>
    patchQuestion(cat.name, qIndex, { sampleResponse })
  }
/>
```

### 5d — Add "Add question" per category

At the bottom of each category's question list (inside the `isCatOpen` block, after the questions map), add an "Add question" inline input:

```typescript
// New per-category state — track which categories have the input open
const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
const [newQuestionText, setNewQuestionText] = useState('');
const [savingQuestion, setSavingQuestion] = useState(false);
```

```typescript
const handleAddQuestion = async (categoryName: string) => {
  const text = newQuestionText.trim();
  if (!text) return;
  setSavingQuestion(true);
  try {
    const updated = await addQuestion(jobId, categoryName, text);
    // Sync local state from server response
    const updatedCategories = updated.categories as InterviewCategory[];
    setCategories(updatedCategories);
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.add(categoryName);
      return next;
    });
    setNewQuestionText('');
    setAddingToCategory(null);
  } catch {
    // addToast is not available here — use a simple inline error or pass it as prop
    // For simplicity, just reset state on error
    setSavingQuestion(false);
    return;
  }
  setSavingQuestion(false);
};
```

> Note: `addQuestion` is imported from `'../../api/interviewPrep'`. `InterviewCategory` from `'../../types'`.

In JSX, after the questions map (still inside the `isCatOpen` block):

```tsx
{/* Add question */}
<div className="px-4 py-3 border-t border-gray-100">
  {addingToCategory === cat.name ? (
    <div className="flex gap-2">
      <input
        type="text"
        value={newQuestionText}
        onChange={(e) => setNewQuestionText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAddQuestion(cat.name);
          if (e.key === 'Escape') { setAddingToCategory(null); setNewQuestionText(''); }
        }}
        placeholder="Type your question…"
        autoFocus
        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      />
      <button
        onClick={() => handleAddQuestion(cat.name)}
        disabled={!newQuestionText.trim() || savingQuestion}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {savingQuestion ? '…' : 'Add'}
      </button>
      <button
        onClick={() => { setAddingToCategory(null); setNewQuestionText(''); }}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={() => setAddingToCategory(cat.name)}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      <span className="text-lg leading-none">+</span> Add question
    </button>
  )}
</div>
```

- [ ] Read the current file
- [ ] Remove `onRegenerate` + `regenerating` from Props and the top header block
- [ ] Add `onSampleGenerated` to each `InterviewAnswerPanel` mount
- [ ] Add per-category state and `handleAddQuestion` function
- [ ] Add the add-question JSX inside each category card
- [ ] Import `addQuestion` from `'../../api/interviewPrep'`
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit`
- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewQuestionsView.tsx
  git commit -m "feat: remove regenerate button and add custom question input per category"
  ```

---

## Task 6 — Client: Update InterviewPrepPanel (remove regenerate props)

**Files:**
- Modify: `client/src/components/jobs/InterviewPrepPanel.tsx`

Read the current file. Remove:
- `handleRegenerate` function
- `regenerating` state
- `onRegenerate={handleRegenerate}` and `regenerating={regenerating}` props from the `InterviewQuestionsView` mount

The `deleteInterviewPrep` import can also be removed if no longer used.

The `InterviewQuestionsView` component now only needs `jobId` and `categories`:

```tsx
<InterviewQuestionsView
  jobId={jobId}
  categories={existingPrep.categories}
/>
```

- [ ] Read the current file
- [ ] Remove `handleRegenerate`, `regenerating` state, and the unused `deleteInterviewPrep` import
- [ ] Update the `InterviewQuestionsView` JSX to remove those props
- [ ] Run `cd /Users/johnathanwong/Desktop/resume-app/client && npx tsc --noEmit`
- [ ] Commit:
  ```bash
  git add client/src/components/jobs/InterviewPrepPanel.tsx
  git commit -m "feat: remove regenerate flow from InterviewPrepPanel"
  ```

---

## Sequencing Notes

- Tasks 1 and 2 are independent and can be done in parallel, but do them sequentially to avoid confusion.
- Task 3 depends only on Task 2 (types).
- Task 4 depends on Task 2 (types + API).
- Task 5 depends on Tasks 2 and 4 (needs `onSampleGenerated` prop from Task 4's Panel changes).
- Task 6 depends on Task 5 (Props interface changes).

## Potential Pitfalls

- **`isCustom` on server types:** The server `InterviewCategory` and `InterviewQuestion` interfaces in `claude.ts` don't have `isCustom`. This is fine — the JSON is untyped at the Prisma layer (`as unknown as InterviewCategory[]`), so extra fields are stored and retrieved transparently. No server type change needed.
- **`onSampleGenerated` prop threading:** Make sure Task 5 adds `onSampleGenerated` to the `InterviewAnswerPanel` mount AFTER Task 4 adds the prop to `InterviewAnswerPanel`'s interface, otherwise TypeScript will error.
- **`addingToCategory` state:** Only one category's input can be open at a time (controlled by the single `addingToCategory: string | null` state). Clicking "Add question" in a different category while one is already open should close the previous one — this is handled automatically by `setAddingToCategory(cat.name)`.
- **`autoFocus` on the add-question input:** Works in Vite/React. No extra handling needed.
