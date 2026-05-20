import { Router } from 'express'
import { z } from 'zod'
import { Profile } from '../models/Profile.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { HttpError } from '../middleware/error.js'
import { persistFile, deleteFile, signedUrlFor } from '../lib/storage.js'
import { parseResume, embed } from '../lib/ai.js'

export const profilesRouter = Router()

/**
 * Helper: replace `resumeUrl` on the response payload with a freshly-signed URL
 * derived from `resumeKey`. Leaves the document untouched.
 */
async function withFreshResumeUrl<T extends { resumeKey?: string; resumeUrl?: string }>(profile: T): Promise<T> {
  if (!profile.resumeKey) return profile
  const url = await signedUrlFor(profile.resumeKey)
  return { ...profile, resumeUrl: url }
}

profilesRouter.get('/me', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    let profile = await Profile.findOne({ userId: req.auth!.userId })
    if (!profile) profile = await Profile.create({ userId: req.auth!.userId })
    const payload = await withFreshResumeUrl(profile.toObject())
    res.json({ profile: payload })
  } catch (err) {
    next(err)
  }
})

const updateSchema = z.object({
  // Required (Core 5)
  headline: z.string().trim().min(2, 'Headline is required'),
  city: z.string().trim().min(1, 'City is required'),
  experienceYears: z.coerce.number().min(0, 'Years of experience is required'),
  skills: z.array(z.string().trim().min(1)).min(1, 'Add at least one skill'),
  expectedSalaryINR: z.coerce.number().positive('Expected salary is required'),

  // Optional
  location: z.string().optional(),
  state: z.string().optional(),
  currentSalaryINR: z.coerce.number().optional(),
  workHistory: z
    .array(
      z.object({
        company: z.string().optional(),
        title: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
        year: z.string().optional(),
      }),
    )
    .optional(),
  visaSponsorshipNeeded: z.boolean().optional(),
  openToRemote: z.boolean().optional(),
})

function buildProfileEmbeddingText(p: {
  headline?: string
  city?: string
  skills?: string[]
  workHistory?: { company?: string; title?: string; description?: string }[]
  education?: { institution?: string; degree?: string }[]
}) {
  const wh = (p.workHistory ?? [])
    .map((w) => [w.title, w.company, w.description].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n')
  const ed = (p.education ?? [])
    .map((e) => [e.degree, e.institution].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n')
  return [p.headline, p.city, (p.skills ?? []).join(', '), wh, ed].filter(Boolean).join('\n')
}

profilesRouter.put('/me', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body)
    const profile = await Profile.findOneAndUpdate(
      { userId: req.auth!.userId },
      { $set: input },
      { new: true, upsert: true },
    )

    // Compute embedding asynchronously — don't block the response.
    void (async () => {
      const text = buildProfileEmbeddingText(input)
      const vec = await embed(text)
      if (vec) {
        await Profile.updateOne({ _id: profile._id }, { $set: { embedding: vec } })
      }
    })()

    const payload = await withFreshResumeUrl(profile.toObject())
    res.json({ profile: payload })
  } catch (err) {
    next(err)
  }
})

profilesRouter.post('/me/resume', requireAuth, requireRole('seeker'), upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'No file uploaded')
    const profile = await Profile.findOne({ userId: req.auth!.userId })
    if (!profile) throw new HttpError(404, 'Profile not found')

    // Delete previous file (S3 or local), best-effort
    if (profile.resumeKey) {
      await deleteFile({ key: profile.resumeKey })
    }

    // Persist new file (S3 if configured, otherwise local /uploads)
    const persisted = await persistFile(req.file.path, req.file.originalname)
    profile.resumeKey = persisted.key
    profile.resumeUrl = persisted.signedUrl
    profile.parseStatus = 'pending'
    profile.parsePreview = null
    await profile.save()

    // Respond immediately; parse asynchronously and stamp results.
    res.json({ resumeUrl: persisted.signedUrl, parseStatus: profile.parseStatus })

    void (async () => {
      try {
        const parsed = await parseResume(persisted.key)
        await Profile.updateOne(
          { _id: profile._id },
          parsed
            ? { $set: { parseStatus: 'done', parsePreview: parsed } }
            : { $set: { parseStatus: 'failed', parsePreview: null } },
        )
      } catch (err) {
        console.error('[parseResume async]', err)
        await Profile.updateOne({ _id: profile._id }, { $set: { parseStatus: 'failed' } })
      }
    })()
  } catch (err) {
    next(err)
  }
})

/**
 * Apply the AI-extracted preview onto the profile's editable fields, then clear the preview.
 * Skills are merged (union) with existing.
 */
profilesRouter.post('/me/apply-parse', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.auth!.userId })
    if (!profile) throw new HttpError(404, 'Profile not found')
    const preview = profile.parsePreview as
      | { headline?: string; skills?: string[]; workHistory?: unknown[]; education?: unknown[] }
      | null
    if (!preview) throw new HttpError(400, 'No parse preview available')

    if (preview.headline && !profile.headline) profile.headline = preview.headline
    if (preview.skills?.length) {
      profile.skills = Array.from(new Set([...(profile.skills ?? []), ...preview.skills]))
    }
    if (preview.workHistory?.length && (profile.workHistory?.length ?? 0) === 0) {
      profile.workHistory = preview.workHistory as never
    }
    if (preview.education?.length && (profile.education?.length ?? 0) === 0) {
      profile.education = preview.education as never
    }
    profile.parsePreview = null
    profile.parseStatus = 'idle'
    await profile.save()
    const payload = await withFreshResumeUrl(profile.toObject())
    res.json({ profile: payload })
  } catch (err) {
    next(err)
  }
})
