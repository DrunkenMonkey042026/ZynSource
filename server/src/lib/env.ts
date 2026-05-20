import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SERVER_PUBLIC_URL: z.string().default('http://localhost:4000'),

  // Phase 2A — optional
  OPENAI_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Phase 2B — optional admin allowlist (comma-separated emails)
  ADMIN_EMAILS: z.string().default(''),

  // Phase 2C — optional SMTP for nodemailer (Brevo / Gmail / Mailtrap etc.)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('ZynSource <noreply@zynsource.app>'),

  // Phase 2E — optional observability
  SENTRY_DSN: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const err of parsed.error.errors) {
    console.error(`  - ${err.path.join('.')}: ${err.message}`)
  }
  console.error('\nMake sure server/.env exists and is filled in. See server/.env.example.')
  process.exit(1)
}

export const env = parsed.data

export const features = {
  resumeParsing: !!env.OPENAI_API_KEY,
  embeddings: !!env.OPENAI_API_KEY,
  aiTools: !!env.OPENAI_API_KEY, // screening / JD polish / chatbot / translation
  cloudStorage: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET),
  email: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
  sentry: !!env.SENTRY_DSN,
  posthog: !!env.POSTHOG_KEY,
}

export const adminEmails = new Set(
  env.ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
)

if (!features.aiTools) console.warn('[features] OpenAI features disabled — set OPENAI_API_KEY')
if (!features.cloudStorage) console.warn('[features] S3 storage disabled — set AWS_* + AWS_S3_BUCKET')
if (!features.email) console.warn('[features] Email disabled — set SMTP_HOST/USER/PASS (e.g. Brevo)')
if (adminEmails.size === 0) console.warn('[features] No admin emails set — admin routes locked. Set ADMIN_EMAILS=a@b.com,c@d.com')
