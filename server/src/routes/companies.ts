import { Router } from 'express'
import { Company } from '../models/Company.js'
import { Job } from '../models/Job.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import { HttpError } from '../middleware/error.js'

export const companiesRouter = Router()

// Public listing — paginated, sorted by jobs count
companiesRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const q = String(req.query.q || '').trim()

    const filter: Record<string, unknown> = {}
    if (q) filter.name = new RegExp(q, 'i')

    const [items, total] = await Promise.all([
      Company.find(filter)
        .sort({ reviewCount: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Company.countDocuments(filter),
    ])

    res.json({ items, total, page, limit })
  } catch (err) {
    next(err)
  }
})

// Public detail
companiesRouter.get('/:slug', async (req, res, next) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug }).lean()
    if (!company) throw new HttpError(404, 'Company not found')

    const [jobs, reviews] = await Promise.all([
      Job.find({ companyId: company._id, status: 'open' }).sort({ createdAt: -1 }).limit(24).lean(),
      Review.find({ companyId: company._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ])

    // Collect any verified flag from the first job's recruiter (a single company may have multiple recruiters; we pick the first verified).
    const recruiterIds = [...new Set(jobs.map((j) => String(j.recruiterId)))]
    const recruiters = await User.find({ _id: { $in: recruiterIds } }).select('verified').lean()
    const anyVerified = recruiters.some((r) => r.verified)

    // Anonymize reviews where the author opted in
    const reviewsClean = reviews.map((r) => ({
      ...r,
      authorUserId: r.anonymous ? null : r.authorUserId,
    }))

    res.json({ company: { ...company, verified: anyVerified }, jobs, reviews: reviewsClean })
  } catch (err) {
    next(err)
  }
})
