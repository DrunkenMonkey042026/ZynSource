import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Company } from '../models/Company.js'
import { Job } from '../models/Job.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { HttpError } from '../middleware/error.js'
import { toSlug } from '../lib/slug.js'

export const adminRouter = Router()

// Mark a recruiter as verified by email
adminRouter.post('/verify-recruiter', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, verified = true } = z
      .object({ email: z.string().email(), verified: z.boolean().optional() })
      .parse(req.body)
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) throw new HttpError(404, 'User not found')
    if (user.role !== 'recruiter') throw new HttpError(400, 'Only recruiters can be verified')
    user.verified = !!verified
    user.verifiedAt = verified ? new Date() : undefined
    await user.save()
    res.json({ user: { id: String(user._id), email: user.email, verified: user.verified } })
  } catch (err) {
    next(err)
  }
})

// One-shot: backfill Company rows from existing job postings
adminRouter.post('/backfill-companies', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const jobs = await Job.find().select('company companyLogoUrl').lean()
    const seen = new Set<string>()
    const created: string[] = []
    for (const j of jobs) {
      const slug = toSlug(j.company)
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      const existing = await Company.findOne({ slug })
      if (existing) continue
      await Company.create({ name: j.company, slug, logoUrl: j.companyLogoUrl })
      created.push(slug)
    }
    // Attach companyId to jobs that don't have it yet
    let linked = 0
    const companies = await Company.find().select('name slug').lean()
    const byName = new Map(companies.map((c) => [c.name, c._id]))
    for (const j of await Job.find({ companyId: { $exists: false } }).select('_id company')) {
      const id = byName.get(j.company)
      if (id) {
        j.companyId = id as never
        await j.save()
        linked++
      }
    }
    res.json({ created, linked })
  } catch (err) {
    next(err)
  }
})
