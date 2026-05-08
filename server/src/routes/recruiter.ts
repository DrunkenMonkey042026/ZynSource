import { Router } from 'express'
import { Job } from '../models/Job.js'
import { Application } from '../models/Application.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const recruiterRouter = Router()

recruiterRouter.get('/jobs', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiterId: req.auth!.userId }).sort({ createdAt: -1 }).lean()
    res.json({ items: jobs })
  } catch (err) {
    next(err)
  }
})

recruiterRouter.get('/stats', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiterId: req.auth!.userId }).select('_id status').lean()
    const jobIds = jobs.map((j) => j._id)
    const totalJobs = jobs.length
    const openJobs = jobs.filter((j) => j.status === 'open').length

    const apps = await Application.find({ jobId: { $in: jobIds } }).select('status').lean()
    const totalApplicants = apps.length
    const statusBreakdown: Record<string, number> = {}
    for (const a of apps) {
      statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1
    }

    res.json({ totalJobs, openJobs, totalApplicants, statusBreakdown })
  } catch (err) {
    next(err)
  }
})
