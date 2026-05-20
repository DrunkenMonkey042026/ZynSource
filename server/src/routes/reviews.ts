import { Router } from 'express'
import { z } from 'zod'
import { Company } from '../models/Company.js'
import { Review } from '../models/Review.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'

export const reviewsRouter = Router()

const reviewSchema = z.object({
  companySlug: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  headline: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(4000),
  anonymous: z.boolean().default(true),
})

reviewsRouter.post('/', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body)
    const company = await Company.findOne({ slug: input.companySlug })
    if (!company) throw new HttpError(404, 'Company not found')

    const existing = await Review.findOne({ companyId: company._id, authorUserId: req.auth!.userId })
    if (existing) throw new HttpError(409, 'You already reviewed this company')

    const review = await Review.create({
      companyId: company._id,
      authorUserId: req.auth!.userId,
      rating: input.rating,
      headline: input.headline,
      body: input.body,
      anonymous: input.anonymous,
    })

    // Recompute aggregates
    const all = await Review.find({ companyId: company._id }).select('rating').lean()
    const count = all.length
    const avg = count ? all.reduce((s, r) => s + r.rating, 0) / count : 0
    company.reviewCount = count
    company.reviewAverage = Math.round(avg * 10) / 10
    await company.save()

    res.json({ review })
  } catch (err) {
    next(err)
  }
})
