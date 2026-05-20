import { Router } from 'express'
import { z } from 'zod'
import { SavedSearch } from '../models/SavedSearch.js'
import { Job } from '../models/Job.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'
import { sendDigestEmail } from '../templates/emails.js'
import { buildJobsFilter } from '../lib/jobs-filter.js'

export const savedSearchesRouter = Router()

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  filters: z
    .object({
      q: z.string().optional(),
      city: z.string().optional(),
      skills: z.string().optional(),
      jobType: z.string().optional(),
      workMode: z.string().optional(),
      expMin: z.string().optional(),
      salaryMin: z.string().optional(),
    })
    .default({}),
  frequency: z.enum(['instant', 'daily', 'weekly']).default('daily'),
})

savedSearchesRouter.get('/', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const items = await SavedSearch.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).lean()
    res.json({ items })
  } catch (err) {
    next(err)
  }
})

savedSearchesRouter.post('/', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const input = upsertSchema.parse(req.body)
    const search = await SavedSearch.create({ ...input, userId: req.auth!.userId })
    res.json({ search })
  } catch (err) {
    next(err)
  }
})

savedSearchesRouter.delete('/:id', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const r = await SavedSearch.deleteOne({ _id: req.params.id, userId: req.auth!.userId })
    if (r.deletedCount === 0) throw new HttpError(404, 'Saved search not found')
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

savedSearchesRouter.post('/:id/send-now', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const search = await SavedSearch.findOne({ _id: req.params.id, userId: req.auth!.userId })
    if (!search) throw new HttpError(404, 'Saved search not found')
    const user = await User.findById(req.auth!.userId).select('email name')
    if (!user) throw new HttpError(404, 'User not found')

    const filter = buildJobsFilter(search.filters as Record<string, string>)
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(10).lean()
    const result = await sendDigestEmail({
      to: user.email,
      name: user.name,
      searchName: search.name,
      jobs: jobs.map((j) => ({ _id: String(j._id), title: j.title, company: j.company, city: j.city })),
    })
    search.lastSentAt = new Date()
    await search.save()
    res.json({ sent: result.sent, count: jobs.length })
  } catch (err) {
    next(err)
  }
})
