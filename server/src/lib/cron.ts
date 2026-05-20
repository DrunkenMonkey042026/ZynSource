import { SavedSearch } from '../models/SavedSearch.js'
import { AnonymousAlert } from '../models/AnonymousAlert.js'
import { Job } from '../models/Job.js'
import { User } from '../models/User.js'
import { sendDigestEmail } from '../templates/emails.js'
import { buildJobsFilter } from './jobs-filter.js'

const SIX_HOURS = 6 * 60 * 60 * 1000

async function runOnce() {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Authenticated saved searches
  const searches = await SavedSearch.find().lean()
  for (const s of searches) {
    const last = s.lastSentAt ?? new Date(0)
    const wantsDaily = s.frequency === 'daily' && last < dayAgo
    const wantsWeekly = s.frequency === 'weekly' && last < weekAgo
    if (!wantsDaily && !wantsWeekly) continue

    const user = await User.findById(s.userId).select('email name')
    if (!user) continue
    const filter = buildJobsFilter(s.filters as Record<string, string>)
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(10).lean()
    if (jobs.length === 0) continue
    await sendDigestEmail({
      to: user.email,
      name: user.name,
      searchName: s.name,
      jobs: jobs.map((j) => ({ _id: String(j._id), title: j.title, company: j.company, city: j.city })),
    })
    await SavedSearch.updateOne({ _id: s._id }, { $set: { lastSentAt: now } })
  }

  // Anonymous email-only alerts
  const anon = await AnonymousAlert.find({ confirmed: true }).lean()
  for (const a of anon) {
    const last = a.lastSentAt ?? new Date(0)
    const wantsDaily = a.frequency === 'daily' && last < dayAgo
    const wantsWeekly = a.frequency === 'weekly' && last < weekAgo
    if (!wantsDaily && !wantsWeekly) continue
    const filter = buildJobsFilter(a.filters as Record<string, string>)
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(10).lean()
    if (jobs.length === 0) continue
    await sendDigestEmail({
      to: a.email,
      name: 'there',
      searchName: 'your saved alert',
      jobs: jobs.map((j) => ({ _id: String(j._id), title: j.title, company: j.company, city: j.city })),
    })
    await AnonymousAlert.updateOne({ _id: a._id }, { $set: { lastSentAt: now } })
  }
}

export function startCron() {
  // Initial delay so we don't race the DB connect
  setTimeout(() => {
    runOnce().catch((err) => console.error('[cron] first run failed:', err))
    setInterval(() => {
      runOnce().catch((err) => console.error('[cron] tick failed:', err))
    }, SIX_HOURS)
  }, 30_000)
  console.log('[cron] in-process digest sender armed (every 6h)')
}
