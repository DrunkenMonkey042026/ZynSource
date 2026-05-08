import { Router } from 'express'
import { Profile } from '../models/Profile.js'
import { Job } from '../models/Job.js'
import { Application } from '../models/Application.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'
import { cosineSim, similarityToPercent } from '../lib/ai.js'
import { features } from '../lib/env.js'

export const matchRouter = Router()

// Helper: load a profile's embedding (must request `+embedding` since `select: false`).
async function getProfileEmbedding(userId: string): Promise<number[] | null> {
  const p = await Profile.findOne({ userId }).select('+embedding').lean()
  return (p?.embedding as number[] | undefined) ?? null
}

/**
 * GET /api/match/jobs-for-me
 * Seeker only. Returns jobs ranked by similarity to the seeker's profile embedding.
 * Falls back to "recent" if embeddings aren't enabled or the profile lacks one.
 */
matchRouter.get('/jobs-for-me', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))

    if (!features.embeddings) {
      // Graceful fallback: return latest open jobs without scores.
      const items = await Job.find({ status: 'open' }).sort({ createdAt: -1 }).limit(limit).lean()
      return res.json({ items, fallback: true })
    }

    const profileEmbedding = await getProfileEmbedding(req.auth!.userId)
    if (!profileEmbedding) {
      const items = await Job.find({ status: 'open' }).sort({ createdAt: -1 }).limit(limit).lean()
      return res.json({ items, fallback: true })
    }

    // In-memory cosine over open jobs that have embeddings (works without Atlas Vector Search).
    // For production scale, swap this for Atlas $vectorSearch (see /server/src/scripts/atlas-vector-index.ts).
    const jobs = await Job.find({ status: 'open' }).select('+embedding').lean()
    const scored = jobs
      .map((j) => {
        const emb = j.embedding as number[] | undefined
        if (!emb || emb.length === 0) return null
        const matchScore = similarityToPercent(cosineSim(profileEmbedding, emb))
        const { embedding, ...rest } = j
        return { ...rest, matchScore }
      })
      .filter(Boolean) as (Record<string, unknown> & { matchScore: number })[]
    scored.sort((a, b) => b.matchScore - a.matchScore)
    res.json({ items: scored.slice(0, limit) })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/match/applicants-for-job/:jobId
 * Recruiter only, owner of the job. Same-shape response as /applications/by-job/:jobId
 * but each item carries a `matchScore` and items are sorted by it (desc).
 */
matchRouter.get('/applicants-for-job/:jobId', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId).select('+embedding')
    if (!job) throw new HttpError(404, 'Job not found')
    if (String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your job')

    const apps = await Application.find({ jobId: job._id }).sort({ createdAt: -1 }).lean()
    const seekerIds = apps.map((a) => a.seekerId)

    const [seekers, profiles] = await Promise.all([
      User.find({ _id: { $in: seekerIds } }).select('name email').lean(),
      Profile.find({ userId: { $in: seekerIds } }).select('+embedding').lean(),
    ])
    const seekerMap = new Map(seekers.map((s) => [String(s._id), s]))
    const profileMap = new Map(profiles.map((p) => [String(p.userId), p]))

    const jobEmbedding = (job.embedding as number[] | undefined) ?? null

    const items = apps.map((app) => {
      const profile = profileMap.get(String(app.seekerId)) || null
      let matchScore: number | undefined
      if (jobEmbedding && profile?.embedding && profile.embedding.length > 0) {
        matchScore = similarityToPercent(cosineSim(jobEmbedding, profile.embedding as number[]))
      }
      // Strip embedding from the wire payload
      const cleanProfile = profile ? { ...profile, embedding: undefined } : null
      return {
        ...app,
        seeker: seekerMap.get(String(app.seekerId)) || null,
        profile: cleanProfile,
        matchScore,
      }
    })

    items.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    res.json({ items, job: { _id: job._id, title: job.title, company: job.company } })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/match/score?jobId=...
 * Seeker only. Single-pair score for a job card badge.
 */
matchRouter.get('/score', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const jobId = String(req.query.jobId || '')
    if (!jobId) throw new HttpError(400, 'jobId required')
    if (!features.embeddings) return res.json({ matchScore: null })

    const [profileEmbedding, job] = await Promise.all([
      getProfileEmbedding(req.auth!.userId),
      Job.findById(jobId).select('+embedding').lean(),
    ])
    if (!profileEmbedding || !job?.embedding) return res.json({ matchScore: null })

    const matchScore = similarityToPercent(cosineSim(profileEmbedding, job.embedding as number[]))
    res.json({ matchScore })
  } catch (err) {
    next(err)
  }
})
