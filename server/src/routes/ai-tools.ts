import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'
import { polishJobDescription, translateToHindi } from '../lib/ai-tools.js'
import { features } from '../lib/env.js'

export const aiToolsRouter = Router()

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const polishSchema = z.object({
  title: z.string().min(2),
  draft: z.string().min(20).max(20_000),
})

aiToolsRouter.post('/polish-jd', aiLimiter, requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    if (!features.aiTools) throw new HttpError(503, 'AI features are offline (OPENAI_API_KEY not set)')
    const { title, draft } = polishSchema.parse(req.body)
    const polished = await polishJobDescription(title, draft)
    if (!polished) throw new HttpError(502, 'Could not polish the description right now')
    res.json({ polished })
  } catch (err) {
    next(err)
  }
})

const translateSchema = z.object({
  text: z.string().min(1).max(20_000),
})

aiToolsRouter.post('/translate-hi', aiLimiter, async (req, res, next) => {
  try {
    if (!features.aiTools) throw new HttpError(503, 'Translation is offline (OPENAI_API_KEY not set)')
    const { text } = translateSchema.parse(req.body)
    const out = await translateToHindi(text)
    if (!out) throw new HttpError(502, 'Could not translate')
    res.json({ translation: out })
  } catch (err) {
    next(err)
  }
})
