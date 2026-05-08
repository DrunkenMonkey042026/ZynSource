import Anthropic from '@anthropic-ai/sdk'
import { env, features } from './env.js'

const anthropic = features.resumeParsing ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! }) : null

export interface ParsedResume {
  headline?: string
  skills?: string[]
  workHistory?: { company?: string; title?: string; startDate?: string; endDate?: string; description?: string }[]
  education?: { institution?: string; degree?: string; year?: string }[]
}

const PARSE_SYSTEM_PROMPT = `You extract structured information from a candidate's resume PDF.

Return ONLY a JSON object matching this exact shape (no markdown, no commentary):

{
  "headline": string,                          // a 1-line professional tagline like "Senior backend engineer | Go + Postgres" derived from their most recent role and top skills
  "skills": string[],                          // canonical skill tags, deduplicated, max 25 items, each ≤ 30 chars (e.g. "React", "TypeScript", "AWS Lambda")
  "workHistory": [
    {
      "company": string,
      "title": string,
      "startDate": string,                     // YYYY-MM if known else best-effort string
      "endDate": string,                       // YYYY-MM, "Present", or empty
      "description": string                    // 1-3 sentences, action-oriented
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "year": string                           // graduation year or year range
    }
  ]
}

Rules:
- Always output valid JSON. If a field is unknown, use an empty string or empty array.
- Order workHistory most-recent first.
- Do NOT invent facts. If a section is absent in the resume, return an empty array.`

/**
 * Parse a resume from a public URL (Cloudinary) or local file path.
 * Returns structured data, or null if parsing is disabled / fails.
 */
export async function parseResume(fileUrl: string): Promise<ParsedResume | null> {
  if (!anthropic) return null

  try {
    let documentSource:
      | { type: 'url'; url: string }
      | { type: 'base64'; media_type: 'application/pdf'; data: string }

    if (/^https?:\/\//i.test(fileUrl)) {
      documentSource = { type: 'url', url: fileUrl }
    } else {
      // Local file — read and base64-encode. Anthropic accepts only PDFs as documents.
      const fs = await import('node:fs')
      const path = await import('node:path')
      const abs = path.join(process.cwd(), fileUrl.replace(/^\/+/, ''))
      const ext = path.extname(abs).toLowerCase()
      if (ext !== '.pdf') {
        // .doc/.docx aren't supported by Anthropic's document API — skip silently for MVP.
        return null
      }
      const buf = fs.readFileSync(abs)
      documentSource = {
        type: 'base64',
        media_type: 'application/pdf',
        data: buf.toString('base64'),
      }
    }

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{ type: 'text', text: PARSE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] as never,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: documentSource } as never,
            { type: 'text', text: 'Extract the structured information now.' },
          ],
        },
      ],
    })

    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as ParsedResume
  } catch (err) {
    console.error('[ai.parseResume] failed:', err)
    return null
  }
}

/**
 * Compute a 1024-dim embedding via Voyage. Returns null if disabled or fails.
 * Uses voyage-3-large for best quality.
 */
export async function embed(text: string): Promise<number[] | null> {
  if (!features.embeddings || !text.trim()) return null

  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.slice(0, 8000), // soft cap; voyage handles up to 32k tokens
        model: 'voyage-3-large',
        input_type: 'document',
      }),
    })
    if (!res.ok) {
      console.error('[ai.embed] voyage status', res.status, await res.text())
      return null
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] }
    return json.data[0]?.embedding ?? null
  } catch (err) {
    console.error('[ai.embed] failed:', err)
    return null
  }
}

/**
 * Cosine similarity in [−1, 1]. Used as in-memory fallback when Atlas Vector Search isn't set up.
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
 * Map cosine similarity (−1..1) → 0..100 percentage with a sensible curve
 * so 0.7 cosine ≈ 85% UI score.
 */
export function similarityToPercent(cos: number): number {
  // Clamp negatives to 0 (irrelevant), then steepen positives
  const c = Math.max(0, cos)
  return Math.round(Math.min(100, c * c * 100 * 1.4))
}
