import { Router } from 'express'
import { z } from 'zod'
import { Application, APPLICATION_STATUSES } from '../models/Application.js'
import { Job } from '../models/Job.js'
import { Profile } from '../models/Profile.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'
import { signedUrlFor } from '../lib/storage.js'
import { scoreScreeningAnswers } from '../lib/ai-tools.js'
import { notify } from '../lib/notify.js'
import {
  sendApplicationSubmittedEmail,
  sendApplicationStatusChangedEmail,
  sendNewApplicantEmail,
} from '../templates/emails.js'

export const applicationsRouter = Router()

const applySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().optional().default(''),
  screeningAnswers: z.array(z.string()).optional().default([]),
})

applicationsRouter.post('/', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const input = applySchema.parse(req.body)
    const job = await Job.findById(input.jobId)
    if (!job) throw new HttpError(404, 'Job not found')
    if (job.status !== 'open') throw new HttpError(400, 'Job is not accepting applications')

    const profile = await Profile.findOne({ userId: req.auth!.userId })
    if (!profile?.resumeKey) throw new HttpError(400, 'Please upload a resume on your profile before applying')

    const missing: string[] = []
    if (!profile.headline?.trim()) missing.push('headline')
    if (!profile.city?.trim()) missing.push('city')
    if (profile.experienceYears == null) missing.push('years of experience')
    if (!profile.skills || profile.skills.length === 0) missing.push('skills')
    if (!profile.expectedSalaryINR) missing.push('expected salary')
    if (missing.length) {
      throw new HttpError(400, `Please complete your profile (${missing.join(', ')}) before applying`)
    }

    if (job.screeningEnabled && (job.screeningQuestions?.length ?? 0) > 0) {
      const expected = job.screeningQuestions!.length
      const provided = input.screeningAnswers ?? []
      if (provided.length !== expected || provided.some((a) => !a?.trim())) {
        throw new HttpError(400, `Please answer all ${expected} screening questions`)
      }
    }

    const existing = await Application.findOne({ jobId: job._id, seekerId: req.auth!.userId })
    if (existing) throw new HttpError(409, 'You have already applied to this job')

    const screeningStatus = job.screeningEnabled && (job.screeningQuestions?.length ?? 0) > 0 ? 'pending' : 'none'

    const application = await Application.create({
      jobId: job._id,
      seekerId: req.auth!.userId,
      resumeKeySnapshot: profile.resumeKey,
      resumeUrlSnapshot: profile.resumeUrl,
      coverLetter: input.coverLetter,
      screeningAnswers: input.screeningAnswers ?? [],
      screeningStatus,
      statusHistory: [{ from: '', to: 'applied', changedBy: req.auth!.userId }],
    })

    job.applicationCount = (job.applicationCount || 0) + 1
    await job.save()

    // Async: score screening answers if present
    if (screeningStatus === 'pending') {
      void (async () => {
        try {
          const qa = (job.screeningQuestions ?? []).map((q, i) => ({
            question: q,
            answer: input.screeningAnswers?.[i] ?? '',
          }))
          const result = await scoreScreeningAnswers(job.title, job.description, qa)
          if (result) {
            await Application.updateOne(
              { _id: application._id },
              {
                $set: {
                  screeningScore: result.overall,
                  screeningRubric: result.rubric,
                  screeningStatus: 'done',
                },
              },
            )
          } else {
            await Application.updateOne({ _id: application._id }, { $set: { screeningStatus: 'failed' } })
          }
        } catch {
          await Application.updateOne({ _id: application._id }, { $set: { screeningStatus: 'failed' } })
        }
      })()
    }

    // Async: notify both sides + send emails
    void (async () => {
      const [seeker, recruiter] = await Promise.all([
        User.findById(req.auth!.userId).select('email name').lean(),
        User.findById(job.recruiterId).select('email name').lean(),
      ])
      if (seeker) {
        await notify({
          userId: String(seeker._id),
          type: 'application_submitted',
          title: `Application sent — ${job.title}`,
          body: `Applied to ${job.company}. Track status under My applications.`,
          link: '/me/applications',
        })
        await sendApplicationSubmittedEmail({
          to: seeker.email,
          name: seeker.name,
          jobTitle: job.title,
          company: job.company,
          jobId: String(job._id),
        })
      }
      if (recruiter) {
        await notify({
          userId: String(recruiter._id),
          type: 'new_applicant',
          title: `New applicant for ${job.title}`,
          body: `${seeker?.name ?? 'A candidate'} just applied.`,
          link: `/recruiter/jobs/${job._id}/applicants`,
        })
        await sendNewApplicantEmail({
          to: recruiter.email,
          recruiterName: recruiter.name,
          applicantName: seeker?.name ?? 'Someone',
          jobTitle: job.title,
          jobId: String(job._id),
        })
      }
    })()

    res.json({ application })
  } catch (err) {
    next(err)
  }
})

applicationsRouter.get('/mine', requireAuth, requireRole('seeker'), async (req, res, next) => {
  try {
    const apps = await Application.find({ seekerId: req.auth!.userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'jobId', select: 'title company city workMode jobType salaryMinINR salaryMaxINR salaryHidden status' })
      .lean()
    res.json({ items: apps })
  } catch (err) {
    next(err)
  }
})

// Recruiter view of applicants for one of their jobs
applicationsRouter.get('/by-job/:jobId', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId)
    if (!job) throw new HttpError(404, 'Job not found')
    if (String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your job')

    const apps = await Application.find({ jobId: job._id }).sort({ createdAt: -1 }).lean()
    const seekerIds = apps.map((a) => a.seekerId)
    const [seekers, profiles] = await Promise.all([
      User.find({ _id: { $in: seekerIds } }).select('name email').lean(),
      Profile.find({ userId: { $in: seekerIds } }).lean(),
    ])
    const seekerMap = new Map(seekers.map((s) => [String(s._id), s]))
    const profileMap = new Map(profiles.map((p) => [String(p.userId), p]))

    const items = await Promise.all(
      apps.map(async (app) => {
        const fresh = app.resumeKeySnapshot ? await signedUrlFor(app.resumeKeySnapshot) : app.resumeUrlSnapshot
        return {
          ...app,
          resumeUrlSnapshot: fresh,
          seeker: seekerMap.get(String(app.seekerId)) || null,
          profile: profileMap.get(String(app.seekerId)) || null,
        }
      }),
    )

    res.json({
      items,
      job: { _id: job._id, title: job.title, company: job.company, screeningQuestions: job.screeningQuestions ?? [] },
    })
  } catch (err) {
    next(err)
  }
})

const statusSchema = z.object({ status: z.enum(APPLICATION_STATUSES) })

applicationsRouter.patch('/:id/status', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body)
    const app = await Application.findById(req.params.id)
    if (!app) throw new HttpError(404, 'Application not found')
    const job = await Job.findById(app.jobId)
    if (!job || String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your application')

    if (app.status !== status) {
      app.statusHistory.push({
        from: app.status,
        to: status,
        changedBy: req.auth!.userId as never,
        at: new Date(),
      } as never)
      app.status = status
      await app.save()

      // Notify seeker + email
      void (async () => {
        const seeker = await User.findById(app.seekerId).select('email name').lean()
        if (!seeker) return
        await notify({
          userId: String(seeker._id),
          type: 'application_status',
          title: `Your application is now: ${status}`,
          body: `${job.company} · ${job.title}`,
          link: '/me/applications',
        })
        await sendApplicationStatusChangedEmail({
          to: seeker.email,
          name: seeker.name,
          jobTitle: job.title,
          company: job.company,
          status,
        })
      })()
    }
    res.json({ application: app })
  } catch (err) {
    next(err)
  }
})

const noteSchema = z.object({ text: z.string().min(1) })

applicationsRouter.post('/:id/notes', requireAuth, requireRole('recruiter'), async (req, res, next) => {
  try {
    const { text } = noteSchema.parse(req.body)
    const app = await Application.findById(req.params.id)
    if (!app) throw new HttpError(404, 'Application not found')
    const job = await Job.findById(app.jobId)
    if (!job || String(job.recruiterId) !== req.auth!.userId) throw new HttpError(403, 'Not your application')

    app.notes.push({ recruiterId: req.auth!.userId as never, text, createdAt: new Date() } as never)
    await app.save()
    res.json({ application: app })
  } catch (err) {
    next(err)
  }
})
