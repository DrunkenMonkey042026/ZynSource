import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Phase 2A — all optional. Features auto-disable if missing; server still boots.
  ANTHROPIC_API_KEY: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
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
  resumeParsing: !!env.ANTHROPIC_API_KEY,
  embeddings: !!env.VOYAGE_API_KEY,
  cloudStorage: !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
}

if (!features.resumeParsing) console.warn('[features] AI resume parsing disabled (set ANTHROPIC_API_KEY)')
if (!features.embeddings) console.warn('[features] AI matching disabled (set VOYAGE_API_KEY)')
if (!features.cloudStorage) console.warn('[features] Cloud storage disabled — resumes will save to local disk (set CLOUDINARY_*)')
