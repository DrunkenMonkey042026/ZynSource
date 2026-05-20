import { Router } from 'express'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import rateLimit from 'express-rate-limit'
import { chat as chatLLM } from '../lib/ai-tools.js'
import { features } from '../lib/env.js'
import { HttpError } from '../middleware/error.js'

export const chatRouter = Router()

const FAQ_PATH = path.join(process.cwd(), 'src', 'data', 'faq.md')
let faqDoc = ''
try {
  faqDoc = fs.readFileSync(FAQ_PATH, 'utf-8')
} catch {
  faqDoc = ''
}

const SYSTEM_PROMPT = `You are the ZynSource help assistant. Answer concisely (1-3 sentences max).

You ONLY answer questions about ZynSource — its features, how to use it, account/profile/applications/recruiting questions.
If asked anything else (general coding, math, jokes, etc.), respond: "I can only help with ZynSource. Try the search box for jobs, or your profile for account settings."

Reference document (FAQ):
${faqDoc}

If the FAQ doesn't cover the question, say so honestly and suggest emailing support@zynsource.app.`

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Try again in a few minutes.' },
})

const inputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .default([]),
})

chatRouter.post('/', chatLimiter, async (req, res, next) => {
  try {
    if (!features.aiTools) throw new HttpError(503, 'Chat is offline (OPENAI_API_KEY not set)')
    const { message, history } = inputSchema.parse(req.body)
    const reply = await chatLLM(SYSTEM_PROMPT, history, message)
    if (!reply) throw new HttpError(502, 'Could not get a reply right now')
    res.json({ reply })
  } catch (err) {
    next(err)
  }
})
