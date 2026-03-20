import OpenAI from 'openai';
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

// ─── Resume Tailoring ────────────────────────────────────────────────────────

export async function tailorResume(contentJson: ResumeContent, jobDescription: string): Promise<ResumeContent> {
  const prompt = `You are an expert resume writer and career coach. Tailor the following resume to better match the job description. Rules:
1. Rewrite the professional summary to align with this role.
2. Enhance experience bullet points to emphasize relevant skills and accomplishments using keywords from the JD.
3. Reorder skills to surface the most relevant ones first.
4. NEVER fabricate skills, experience, or achievements the candidate does not have.
5. Return ONLY valid JSON matching the exact same schema as the input. No markdown, no explanation.

Resume JSON:
${JSON.stringify(contentJson, null, 2)}

Job Description:
${jobDescription}`;

  async function attempt(): Promise<ResumeContent> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content ?? '';
    return JSON.parse(text) as ResumeContent;
  }

  return await attempt();
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
