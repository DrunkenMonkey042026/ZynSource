import { Router } from 'express'
import { z } from 'zod'
import { Job } from '../models/Job.js'
import { Company } from '../models/Company.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'
import { embed } from '../lib/ai.js'
import { generateScreeningQuestions } from '../lib/ai-tools.js'
import { toSlug } from '../lib/slug.js'

function buildJobEmbeddingText(j: { title?: string; description?: string; skills?: string[]; company?: string; city?: string }) {
  return [j.title, j.company, j.city, (j.skills ?? []).join(', '), j.description].filter(Boolean).join('\n')
}

async function ensureCompanyId(companyName: string, logoUrl?: string) {
  const slug = toSlug(companyName)
  if (!slug) return undefined
  let company = await Company.findOne({ slug })
  if (!company) {
    company = await Company.create({ name: companyName, slug, logoUrl: logoUrl ?? '' })
  }
  return company._id
}

export const jobsRouter = Router()

// Public: list jobs with filters
jobsRouter.get('/', async (req, res, next) => {
  try {
    const {
      q,
      city,
      skills,
      jobType,
      workMode,
      expMin,
      expMax,
      salaryMin,
      visa,
      page = '1',
      limit = '20',
      sort = 'recent',
    } = req.query as Record<string, string | undefined>

    const filter: Record<string, unknown> = { status: 'open' }
    if (q && q.trim()) filter.$text = { $search: q.trim() }
    if (city) filter.city = new RegExp(`^${city}$`, 'i')
    if (skills) {
      const list = String(skills)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (list.length) filter.skills = { $in: list.map((s) => new RegExp(`^${s}$`, 'i')) }
    }
    if (jobType) filter.jobType = jobType
    if (workMode) filter.workMode = workMode
    if (expMin) filter.experienceMax = { $gte: Number(expMin) }
    if (expMax) filter.experienceMin = { ...(filter.experienceMin as object), $lte: Number(expMax) }
    if (salaryMin) filter.salaryMaxINR = { $gte: Number(salaryMin) }
    if (visa === 'true') filter.visaSponsorship = true

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)))

    const sortBy: Record<string, 1 | -1> =
      sort === 'salary' ? { salaryMaxINR: -1, createdAt: -1 } : { createdAt: -1 }

    const [items, total] = await Promise.all([
      Job.find(filter)
        .sort(sortBy)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Job.countDocuments(filter),
    ])

    // Hydrate verified flag from recruiters
    const recruiterIds = [...new Set(items.map((j) => String(j.recruiterId)))]
    const recruiters = await User.find({ _id: { $in: recruiterIds } }).select('verified').lean()
    const verifiedMap = new Map(recruiters.map((r) => [String(r._id), !!r.verified]))
    const hydrated = items.map((j) => ({ ...j, recruiterVerified: verifiedMap.get(String(j.recruiterId)) ?? false }))

    res.json({ items: hydrated, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) })
  } catch (err) {
    next(err)
  }
})

// Public: single job
jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean()
    if (!job) throw new HttpError(404, 'Job not found')
    const recruiter = await User.findById(job.recruiterId).select('verified').lean()
    res.json({ job: { ...job, recruiterVerified: !!recruiter?.verified } })
  } catch (err) {
    next(err)
  }
})

const jobInputSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  descriptionHi: z.string().optional().default(''),
  company: z.string().min(1),
  companyLogoUrl: z.string().optional().default(''),
  location: z.string().optional().default(''),
  city: z.string().min(1),
  state: z.string().optional().default(''),
  country: z.string().optional().default('IN'),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).default('onsite'),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']).default('full-time'),
  experienceMin: z.coerce.number().min(0).default(0),
  experienceMax: z.coerce.number().min(0).default(0),
  salaryMinINR: z.coerce.number().optional(),
  salaryMaxINR: z.coerce.number().optional(),
  salaryHidden: z.boolean().default(false),
  skills: z.array(z.string()).default([]),
  visaSponsorship: z.boolean().default(false),
  status: z.enum(['open', 'closed', 'draft']).default('open'),
  screeningEnabled: z.boolean().default(false),
  screeningPromptHint: z.string().optional().default(''),
  languagesSupported: z.array(z.enum(['en', 'hi'])).optional(),
})

jobsRouter.post('/', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const input = jobInputSchema.parse(req.body)
    const companyId = await ensureCompanyId(input.company, input.companyLogoUrl)
    const job = await Job.create({ ...input, recruiterId: req.auth!.userId, companyId })

    // Compute embedding asynchronously
    void (async () => {
      const vec = await embed(buildJobEmbeddingText(input))
      if (vec) await Job.updateOne({ _id: job._id }, { $set: { embedding: vec } })
    })()

    // Generate screening questions asynchronously if enabled
    if (input.screeningEnabled) {
      void (async () => {
        const questions = await generateScreeningQuestions(input.title, input.description, input.screeningPromptHint)
        if (questions.length > 0) {
          await Job.updateOne({ _id: job._id }, { $set: { screeningQuestions: questions } })
        }
      })()
    }

    res.json({ job })
  } catch (err) {
    next(err)
  }
})

jobsRouter.patch('/:id', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
    if (!job) throw new HttpError(404, 'Job not found')
    if (String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your job')
    const input = jobInputSchema.partial().parse(req.body)
    Object.assign(job, input)
    if ('company' in input && input.company) {
      const companyId = await ensureCompanyId(input.company, input.companyLogoUrl)
      if (companyId) job.companyId = companyId as never
    }
    await job.save()

    // Re-embed if any text-relevant field changed
    if (
      'title' in input || 'description' in input || 'skills' in input || 'company' in input || 'city' in input
    ) {
      void (async () => {
        const vec = await embed(
          buildJobEmbeddingText({
            title: job.title,
            description: job.description,
            skills: job.skills,
            company: job.company,
            city: job.city,
          }),
        )
        if (vec) await Job.updateOne({ _id: job._id }, { $set: { embedding: vec } })
      })()
    }

    res.json({ job })
  } catch (err) {
    next(err)
  }
})

jobsRouter.delete('/:id', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
    if (!job) throw new HttpError(404, 'Job not found')
    if (String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your job')
    await job.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
