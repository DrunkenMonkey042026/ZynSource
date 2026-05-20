import { Router } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { AnonymousAlert } from '../models/AnonymousAlert.js'
import { Job } from '../models/Job.js'
import { sendDigestEmail } from '../templates/emails.js'
import { sendMail, renderChrome } from '../lib/mail.js'
import { buildJobsFilter } from '../lib/jobs-filter.js'
import { env } from '../lib/env.js'
import { HttpError } from '../middleware/error.js'

export const alertsRouter = Router()

const subscribeSchema = z.object({
  email: z.string().email(),
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
  frequency: z.enum(['daily', 'weekly']).default('weekly'),
})

alertsRouter.post('/subscribe', async (req, res, next) => {
  try {
    const input = subscribeSchema.parse(req.body)
    const token = crypto.randomBytes(16).toString('hex')
    const alert = await AnonymousAlert.create({
      email: input.email.toLowerCase(),
      filters: input.filters,
      frequency: input.frequency,
      confirmToken: token,
      confirmed: false,
    })
    const confirmUrl = `${env.SERVER_PUBLIC_URL.replace(/\/+$/, '')}/api/alerts/confirm/${token}`
    await sendMail({
      to: input.email,
      subject: 'Confirm your ZynSource job alert',
      html: renderChrome({
        headline: 'Confirm your job alert',
        bodyHtml: `<p>Click the button below to start receiving ${input.frequency} digests for jobs matching your filters.</p>`,
        ctaLabel: 'Confirm subscription',
        ctaUrl: confirmUrl,
      }),
    })
    res.json({ ok: true, id: String(alert._id) })
  } catch (err) {
    next(err)
  }
})

alertsRouter.get('/confirm/:token', async (req, res, next) => {
  try {
    const alert = await AnonymousAlert.findOne({ confirmToken: req.params.token })
    if (!alert) throw new HttpError(404, 'Invalid or used confirmation link')
    alert.confirmed = true
    alert.confirmToken = ''
    await alert.save()
    res.redirect(env.CLIENT_URL.replace(/\/+$/, '') + '/?subscribed=1')
  } catch (err) {
    next(err)
  }
})

alertsRouter.post('/:id/unsubscribe', async (req, res, next) => {
  try {
    const r = await AnonymousAlert.deleteOne({ _id: req.params.id })
    if (r.deletedCount === 0) throw new HttpError(404, 'Not found')
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Manual dev trigger: send all confirmed alerts now (testing). Production uses cron.
alertsRouter.post('/run-now', async (_req, res, next) => {
  try {
    const alerts = await AnonymousAlert.find({ confirmed: true }).lean()
    let sent = 0
    for (const a of alerts) {
      const filter = buildJobsFilter(a.filters as Record<string, string>)
      const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(10).lean()
      const r = await sendDigestEmail({
        to: a.email,
        name: 'there',
        searchName: 'your saved alert',
        jobs: jobs.map((j) => ({ _id: String(j._id), title: j.title, company: j.company, city: j.city })),
      })
      if (r.sent) sent++
    }
    res.json({ ok: true, sent, total: alerts.length })
  } catch (err) {
    next(err)
  }
})
