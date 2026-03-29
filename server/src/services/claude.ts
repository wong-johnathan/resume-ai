import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface ResumeContent {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    portfolioUrl?: string | null;
  };
  summary: string;
  experiences: Array<{
    company: string;
    title: string;
    location?: string | null;
    startDate: string | Date;
    endDate?: string | Date | null;
    isCurrent: boolean;
    description: string;
    order: number;
  }>;
  educations: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
    startDate: string | Date;
    endDate?: string | Date | null;
    gpa?: string | null;
    order: number;
  }>;
  skills: Array<{ name: string; level: string; category?: string | null }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate?: string | Date | null;
    credentialUrl?: string | null;
  }>;
}

// ─── Tailor Result Types ──────────────────────────────────────────────────────

export interface BulletChange {
  type: 'reworded' | 'added' | 'removed' | 'unchanged' | 'combined';
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

// ─── Tailor Result Zod Schema ─────────────────────────────────────────────────

const bulletChangeSchema = z.object({
  type: z.enum(['reworded', 'added', 'removed', 'unchanged', 'combined']),
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

// ─── Interview Prep ───────────────────────────────────────────────────────────

export interface InterviewFeedback {
  strengths: string[];
  improvements: string[];
  sampleResponse: string;
}

export interface InterviewQuestion {
  question: string;
  userAnswer?: string;
  feedback?: InterviewFeedback;
}

export interface InterviewCategory {
  name: string;
  questionCount: number;
  questions: InterviewQuestion[];
}

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
- Every change must have a specific, actionable reason tied to the job description.`;

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

IMPORTANT: skill "type" must be exactly one of: "added" | "removed" | "reordered" | "unchanged". Use "unchanged" for skills that were kept as-is.
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

  if (
    !tailored ||
    typeof tailored !== 'object' ||
    Array.isArray(tailored) ||
    !('personalInfo' in tailored) ||
    !('experiences' in tailored) ||
    !('skills' in tailored)
  ) {
    throw new Error('AI returned malformed tailored resume content');
  }

  return { tailored, changes };
}

// ─── Cover Letter (streaming) ─────────────────────────────────────────────────

interface ProfileForCoverLetter {
  firstName: string;
  lastName: string;
  summary?: string | null;
  experiences: Array<{ title: string; company: string; description: string }>;
  skills: Array<{ name: string }>;
}

export async function generateCoverLetter(
  profile: ProfileForCoverLetter,
  jobDescription: string,
  tone: string,
  onChunk: (text: string) => void
): Promise<void> {
  const topSkills = profile.skills.slice(0, 8).map((s) => s.name).join(', ');
  const recentExp = profile.experiences[0];

  const prompt = `You are a professional career writer. Write a compelling, personalized cover letter. Rules:
- Tone: ${tone}
- 3-4 paragraphs, concise and specific
- Open with a strong hook (never "I am writing to express my interest")
- Highlight 2-3 specific relevant achievements
- Close with a confident call to action
- Use placeholders [Hiring Manager Name] and [Date]
- Output plain text only, no subject line

Candidate:
Name: ${profile.firstName} ${profile.lastName}
${recentExp ? `Most Recent Role: ${recentExp.title} at ${recentExp.company}` : ''}
Summary: ${profile.summary ?? 'Not provided'}
Top Skills: ${topSkills}
${recentExp ? `Recent Achievements: ${recentExp.description.slice(0, 300)}` : ''}

Job Description:
${jobDescription}`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) onChunk(text);
  }
}

// ─── Parse PDF Resume ─────────────────────────────────────────────────────────

export interface ParsedProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  summary?: string | null;
  experiences: Array<{ company: string; title: string; location?: string | null; startDate: string; endDate?: string | null; isCurrent: boolean; description: string; order: number }>;
  educations: Array<{ institution: string; degree: string; fieldOfStudy?: string | null; startDate: string; endDate?: string | null; gpa?: string | null; order: number }>;
  skills: Array<{ name: string; level: string }>;
  certifications: Array<{ name: string; issuer: string; issueDate?: string | null; credentialUrl?: string | null }>;
}

export async function parsePdfResume(text: string): Promise<ParsedProfile> {
  const prompt = `Extract all information from this resume and return it as JSON. Rules:
- Return ONLY valid JSON, no markdown fences
- Use YYYY-MM-DD format for dates (use YYYY-01-01 if only year is known)
- Set isCurrent: true and endDate: null for current positions
- For skills, use level: "INTERMEDIATE" unless explicitly stated
- Order experiences and educations with most recent first (order starts at 0)
- Combine all bullet points/responsibilities into the description field as plain text

JSON Schema:
{
  "firstName": "", "lastName": "", "email": "", "phone": null, "location": null,
  "linkedinUrl": null, "githubUrl": null, "portfolioUrl": null, "summary": null,
  "experiences": [{"company":"","title":"","location":null,"startDate":"YYYY-MM-DD","endDate":null,"isCurrent":false,"description":"","order":0}],
  "educations": [{"institution":"","degree":"","fieldOfStudy":null,"startDate":"YYYY-MM-DD","endDate":null,"gpa":null,"order":0}],
  "skills": [{"name":"","level":"INTERMEDIATE"}],
  "certifications": [{"name":"","issuer":"","issueDate":null,"credentialUrl":null}]
}

Resume text:
${text}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.choices[0].message.content ?? '';
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned) as ParsedProfile;
}

// ─── Extract Job Info from raw text ──────────────────────────────────────────

export interface ExtractedJobInfo {
  company: string;
  jobTitle: string;
  location?: string | null;
  description: string;
}

export async function extractJobInfo(rawText: string): Promise<ExtractedJobInfo> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Extract the job posting information from the following text. Return ONLY valid JSON with these fields:
- "company": the hiring company name (string)
- "jobTitle": the job title/role (string)
- "location": city/state/country or "Remote" if applicable (string or null)
- "description": the full job description including responsibilities and requirements (string, preserve as much detail as possible)

If a field cannot be determined, use null for optional fields or an empty string for required fields.

Text:
${rawText.slice(0, 8000)}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? '{}';
  return JSON.parse(text) as ExtractedJobInfo;
}

// ─── Analyze Job Fit ──────────────────────────────────────────────────────────

export interface FitAnalysis {
  score: number;
  strengths: string[];
  gaps: string[];
  summary: string;
}

interface FitAnalysisInput {
  jobDescription: string;
  resumeContent?: ResumeContent;
  profile: {
    summary?: string | null;
    experiences: Array<{ title: string; company: string; description: string }>;
    skills: Array<{ name: string; level: string }>;
  };
}

export async function analyzeJobFit(input: FitAnalysisInput): Promise<FitAnalysis> {
  const { jobDescription, resumeContent, profile } = input;

  const skillsList = resumeContent
    ? resumeContent.skills.map((s) => `${s.name} (${s.level})`).join(', ')
    : profile.skills.map((s) => `${s.name} (${s.level})`).join(', ');

  const experienceText = resumeContent
    ? resumeContent.experiences
        .slice(0, 3)
        .map((e) => `${e.title} at ${e.company}: ${e.description.slice(0, 200)}`)
        .join('\n')
    : profile.experiences
        .slice(0, 3)
        .map((e) => `${e.title} at ${e.company}: ${e.description.slice(0, 200)}`)
        .join('\n');

  const summaryText = resumeContent?.summary ?? profile.summary ?? '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Analyze how well this candidate fits the job description. Write everything in second person, directly addressing the candidate as "you" — never use "the candidate", "they", or "their". Return ONLY valid JSON with:
- "score": integer 0-100 representing overall fit percentage
- "strengths": array of 3-5 short strings describing what makes you a strong fit (e.g. "Your 5 years of React experience aligns well with...")
- "gaps": array of 3-5 short strings describing skills or experience you lack (e.g. "You haven't listed experience with Kubernetes...")
- "summary": 1-2 sentence narrative addressed directly to you (e.g. "You are a strong fit for this role because...")

Candidate Profile:
Summary: ${summaryText}
Skills: ${skillsList}
Experience:
${experienceText}

Job Description:
${jobDescription.slice(0, 3000)}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? '{}';
  return JSON.parse(text) as FitAnalysis;
}

// ─── Generate Summary from scratch ───────────────────────────────────────────

export async function generateSummary(
  targetRole: string,
  experiences: Array<{ title: string; company: string; description: string }>,
  skills: Array<{ name: string }>
): Promise<string> {
  const expText = experiences
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}: ${e.description.slice(0, 200)}`)
    .join('\n');
  const skillsList = skills.slice(0, 10).map((s) => s.name).join(', ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Write a professional resume summary for a candidate targeting the role of "${targetRole}". Keep it 2-3 sentences, punchy and keyword-rich. Return only the summary text, nothing else.

${expText ? `Experience:\n${expText}` : ''}
${skillsList ? `Skills: ${skillsList}` : ''}`.trim(),
      },
    ],
  });

  return response.choices[0].message.content?.trim() ?? '';
}

// ─── Improve Summary ─────────────────────────────────────────────────────────

export async function improveSummary(currentSummary: string, targetRole: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Rewrite this professional resume summary to be punchy, keyword-rich, and tailored for the target role. Keep it 2-3 sentences maximum. Return only the improved summary text, nothing else.

Current summary: "${currentSummary}"
Target role: "${targetRole}"`,
      },
    ],
  });

  return response.choices[0].message.content?.trim() ?? currentSummary;
}

// ─── Generate Interview Categories ───────────────────────────────────────────

export async function generateInterviewCategories(
  jobDescription: string,
  profile: {
    summary?: string | null;
    experiences: Array<{ title: string; company: string }>;
    skills: Array<{ name: string }>;
  }
): Promise<string[]> {
  const skillNames = profile.skills.map((s) => s.name).join(', ');
  const recentRoles = profile.experiences
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}`)
    .join('; ');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'You are an interview coach. Given a job description and candidate background, return a JSON object with a "categories" array of 4–8 interview category names relevant to the role. Examples: "Behavioral", "System Design", "JavaScript", "Java", "Leadership", "Technical Problem Solving", "SQL", "React". Only include categories that are genuinely relevant.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCandidate Skills: ${skillNames}\nRecent Roles: ${recentRoles}\nSummary: ${profile.summary ?? 'N/A'}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
  return Array.isArray(parsed.categories) ? parsed.categories : [];
}

// ─── Generate Interview Questions ─────────────────────────────────────────────

export async function generateInterviewQuestions(
  jobDescription: string,
  profile: {
    summary?: string | null;
    experiences: Array<{ title: string; company: string; description: string }>;
    skills: Array<{ name: string }>;
  },
  selections: Array<{ name: string; questionCount: number }>
): Promise<Array<{ name: string; questions: InterviewQuestion[] }>> {
  const skillNames = profile.skills.map((s) => s.name).join(', ');
  const recentRoles = profile.experiences
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company}: ${e.description?.slice(0, 200) ?? ''}`)
    .join('\n');

  const categoryInstructions = selections
    .map((s) => `- "${s.name}": exactly ${s.questionCount} questions`)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert interview coach. Generate tailored interview questions for a candidate based on their background and a specific job description. Return a JSON object with a "categories" array, each item having "name" (string) and "questions" (string array of question text only). Questions should be specific, actionable, and relevant to both the role and the candidate\'s experience.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCandidate Skills: ${skillNames}\nRecent Experience:\n${recentRoles}\nSummary: ${profile.summary ?? 'N/A'}\n\nGenerate questions for these categories:\n${categoryInstructions}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
  const raw: Array<{ name: string; questions: string[] }> = Array.isArray(parsed.categories)
    ? parsed.categories
    : [];
  // Wrap each question string into InterviewQuestion shape
  return raw.map((cat) => ({
    name: cat.name,
    questions: cat.questions.map((q) => ({ question: q })),
  }));
}

// ─── Generate Sample Response ─────────────────────────────────────────────────

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

// ─── Evaluate Interview Answer ────────────────────────────────────────────────

export async function evaluateInterviewAnswer(
  question: string,
  userAnswer: string,
  jobDescription: string,
  categoryName: string
): Promise<InterviewFeedback> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 800,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior interview coach evaluating a candidate\'s answer. Return a JSON object with: "strengths" (string array of 2-3 things done well), "improvements" (string array of 2-3 specific areas to improve or expand), and "sampleResponse" (a single string with a stronger, more tailored version of the answer — 3-5 sentences). Be honest but encouraging.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCategory: ${categoryName}\nQuestion: ${question}\n\nCandidate Answer:\n${userAnswer}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    sampleResponse: parsed.sampleResponse ?? '',
  };
}

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
