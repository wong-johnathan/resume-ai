import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string(),
  SESSION_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
  ADMIN_GOOGLE_CLIENT_ID: z.string().optional(),
  ADMIN_GOOGLE_CLIENT_SECRET: z.string().optional(),
  ADMIN_GOOGLE_CALLBACK_URL: z.string().optional(),
  ADMIN_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
