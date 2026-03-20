import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string(),
  SESSION_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
