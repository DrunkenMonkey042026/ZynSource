import OpenAI from 'openai'
import { env, features } from './env.js'
import { fetchBytes } from './storage.js'

const openai = features.resumeParsing ? new OpenAI({ apiKey: env.OPENAI_API_KEY! }) : null

export interface ParsedResume {
  headline?: string
  skills?: string[]
  workHistory?: { company?: string; title?: string; startDate?: string; endDate?: string; description?: string }[]
  education?: { institution?: string; degree?: string; year?: string }[]
}

const PARSE_SYSTEM_PROMPT = `You extract structured information from a candidate's resume.

Return ONLY a JSON object matching this exact shape (no markdown, no commentary):

{
  "headline": string,
  "skills": string[],
  "workHistory": [
    { "company": string, "title": string, "startDate": string, "endDate": string, "description": string }
  ],
  "education": [
    { "institution": string, "degree": string, "year": string }
  ]
}

Rules:
- headline: a 1-line professional tagline like "Senior backend engineer | Go + Postgres" derived from their most recent role and top skills.
- skills: canonical skill tags, deduplicated, max 25, each ≤ 30 chars.
- workHistory: most-recent first. startDate/endDate as YYYY-MM (use "Present" for current). description = 1-3 action-oriented sentences.
- education: institution, degree, graduation year or year range.
- If a field is unknown, use an empty string. If a section is absent, return an empty array.
- Do NOT invent facts.
- Output valid JSON, nothing else.`

/**
 * Parse a resume by S3 key (or local /uploads path).
 * Extracts text from the PDF, then asks GPT-4o-mini to structure it.
 * Returns null if parsing is disabled, the file isn't a PDF, or extraction fails.
 */
export async function parseResume(key: string): Promise<ParsedResume | null> {
  if (!openai) return null
  if (!key || !key.toLowerCase().endsWith('.pdf')) return null

  try {
    const bytes = await fetchBytes(key)
    if (!bytes) return null

    // pdf-parse is CJS; default-import handles both ESM and CJS interop in tsx
    const pdfParseMod = await import('pdf-parse')
    const pdfParse = (pdfParseMod.default ?? pdfParseMod) as (b: Buffer) => Promise<{ text: string }>
    const { text } = await pdfParse(bytes)
    const trimmed = text.trim().slice(0, 18_000) // keep prompt cheap
    if (!trimmed) return null

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: `Here is the resume text. Extract the structured information now.\n\n---\n\n${trimmed}` },
      ],
      max_tokens: 1500,
    })

    const raw = resp.choices[0]?.message?.content
    if (!raw) return null
    return JSON.parse(raw) as ParsedResume
  } catch (err) {
    console.error('[ai.parseResume] failed:', err)
    return null
  }
}

/**
 * Compute a 1536-dim embedding via OpenAI text-embedding-3-small.
 * Returns null if disabled or fails.
 */
export async function embed(text: string): Promise<number[] | null> {
  if (!openai || !text.trim()) return null
  try {
    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    })
    return resp.data[0]?.embedding ?? null
  } catch (err) {
    console.error('[ai.embed] failed:', err)
    return null
  }
}

/**
 * Cosine similarity in [-1, 1].
 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Map cosine similarity (-1..1) → 0..100 % with a sensible curve so
 * 0.7 cosine ≈ 85% UI score.
 */
export function similarityToPercent(cos: number): number {
  const c = Math.max(0, cos)
  return Math.round(Math.min(100, c * c * 100 * 1.4))
}
