import OpenAI from 'openai'
import { env, features } from './env.js'

const openai = features.aiTools ? new OpenAI({ apiKey: env.OPENAI_API_KEY! }) : null

/**
 * Generate up to N role-specific screening questions from a job description.
 */
export async function generateScreeningQuestions(
  jobTitle: string,
  jobDescription: string,
  hint?: string,
  n = 3,
): Promise<string[]> {
  if (!openai) return []
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write 3 short, role-specific screening questions for a job posting. ' +
            'Each question must elicit a concrete past example (not preferences). ' +
            'Return JSON: { "questions": [string, string, string] }. No commentary.',
        },
        {
          role: 'user',
          content:
            `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}\n\n` +
            (hint ? `Hint from recruiter: ${hint}\n\n` : '') +
            `Write ${n} questions.`,
        },
      ],
      max_tokens: 400,
    })
    const raw = resp.choices[0]?.message?.content
    if (!raw) return []
    const parsed = JSON.parse(raw) as { questions?: string[] }
    return (parsed.questions ?? []).slice(0, n).filter(Boolean)
  } catch (err) {
    console.error('[ai-tools.generateScreeningQuestions]', err)
    return []
  }
}

export interface ScreeningRubricEntry {
  questionIndex: number
  score: number // 0..10
  rationale: string
}

/**
 * Score each answer 0..10 with rationale. Returns the rubric + normalized 0..100 overall score.
 */
export async function scoreScreeningAnswers(
  jobTitle: string,
  jobDescription: string,
  qa: { question: string; answer: string }[],
): Promise<{ rubric: ScreeningRubricEntry[]; overall: number } | null> {
  if (!openai || qa.length === 0) return null
  try {
    const items = qa
      .map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.answer || '(no answer)'}\n`)
      .join('\n')
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You score candidate screening answers against a job. ' +
            'For each answer, give an integer 0..10 (0 missing/irrelevant, 5 average, 10 outstanding) and a 1-sentence rationale. ' +
            'Return JSON exactly: { "items": [{ "questionIndex": number, "score": number, "rationale": string }] }. No commentary.',
        },
        {
          role: 'user',
          content: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}\n\n${items}`,
        },
      ],
      max_tokens: 800,
    })
    const raw = resp.choices[0]?.message?.content
    if (!raw) return null
    const parsed = JSON.parse(raw) as { items?: ScreeningRubricEntry[] }
    const rubric = (parsed.items ?? []).map((e, i) => ({
      questionIndex: typeof e.questionIndex === 'number' ? e.questionIndex : i,
      score: Math.max(0, Math.min(10, Math.round(e.score ?? 0))),
      rationale: e.rationale ?? '',
    }))
    if (rubric.length === 0) return null
    const overall = Math.round((rubric.reduce((s, r) => s + r.score, 0) / (rubric.length * 10)) * 100)
    return { rubric, overall }
  } catch (err) {
    console.error('[ai-tools.scoreScreeningAnswers]', err)
    return null
  }
}

/**
 * Polish a rough job description into clear, structured markdown.
 */
export async function polishJobDescription(title: string, draft: string): Promise<string | null> {
  if (!openai || !draft.trim()) return null
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You rewrite job descriptions to be clearer, more structured, and more compelling. ' +
            'Preserve every factual detail (company, location, salary, skills, requirements). ' +
            'Output markdown only — no commentary, no surrounding fences. ' +
            'Use these sections in order: "About the role", "What you\'ll do" (3-6 bullets), ' +
            '"What we\'re looking for" (3-6 bullets), "Nice to have" (optional).',
        },
        { role: 'user', content: `Title: ${title}\n\nDraft:\n${draft}` },
      ],
      max_tokens: 1200,
    })
    return resp.choices[0]?.message?.content?.trim() ?? null
  } catch (err) {
    console.error('[ai-tools.polishJobDescription]', err)
    return null
  }
}

/**
 * Run a single chat turn for the FAQ chatbot. `history` is the rolling list of prior turns.
 */
export async function chat(
  faqSystemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): Promise<string | null> {
  if (!openai) return null
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: faqSystemPrompt },
        ...history.slice(-10),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
    })
    return resp.choices[0]?.message?.content ?? null
  } catch (err) {
    console.error('[ai-tools.chat]', err)
    return null
  }
}

/**
 * Translate markdown/plain text into Hindi. Used for on-the-fly job description translation.
 */
const translationCache = new Map<string, string>()
const TRANSLATION_CACHE_MAX = 200

export async function translateToHindi(text: string): Promise<string | null> {
  if (!openai || !text.trim()) return null
  const key = text.slice(0, 200)
  if (translationCache.has(key)) return translationCache.get(key)!
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You translate job descriptions from English to natural, professional Hindi (हिन्दी). ' +
            'Preserve markdown formatting exactly. Keep brand names and technical terms in English when they are commonly used that way in Indian tech workplaces. ' +
            'Output only the translation, no commentary.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 2000,
    })
    const out = resp.choices[0]?.message?.content?.trim() ?? null
    if (out) {
      if (translationCache.size >= TRANSLATION_CACHE_MAX) {
        const firstKey = translationCache.keys().next().value
        if (firstKey) translationCache.delete(firstKey)
      }
      translationCache.set(key, out)
    }
    return out
  } catch (err) {
    console.error('[ai-tools.translateToHindi]', err)
    return null
  }
}
