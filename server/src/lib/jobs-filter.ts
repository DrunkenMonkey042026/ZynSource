/**
 * Shared "build a Mongoose find() filter from the /api/jobs query shape".
 * Pulled out so cron + saved-searches can use it without duplicating /routes/jobs.ts.
 */
export function buildJobsFilter(q: Partial<Record<string, string>>) {
  const filter: Record<string, unknown> = { status: 'open' }
  if (q.q && q.q.trim()) filter.$text = { $search: q.q.trim() }
  if (q.city) filter.city = new RegExp(`^${q.city}$`, 'i')
  if (q.skills) {
    const list = String(q.skills).split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length) filter.skills = { $in: list.map((s) => new RegExp(`^${s}$`, 'i')) }
  }
  if (q.jobType) filter.jobType = q.jobType
  if (q.workMode) filter.workMode = q.workMode
  if (q.expMin) filter.experienceMax = { $gte: Number(q.expMin) }
  if (q.salaryMin) filter.salaryMaxINR = { $gte: Number(q.salaryMin) }
  return filter
}
