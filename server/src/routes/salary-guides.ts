import { Router } from 'express'
import { Job } from '../models/Job.js'
import { HttpError } from '../middleware/error.js'

export const salaryGuidesRouter = Router()

interface Cached<T> {
  ts: number
  value: T
}
const cache = new Map<string, Cached<unknown>>()
const TTL_MS = 60 * 60 * 1000 // 1h

function getCached<T>(key: string): T | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.value as T
}
function setCached<T>(key: string, value: T) {
  cache.set(key, { ts: Date.now(), value })
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

function avgOfMidpoints(jobs: { salaryMinINR?: number | null; salaryMaxINR?: number | null }[]) {
  const mids = jobs
    .map((j) => {
      const lo = j.salaryMinINR ?? 0
      const hi = j.salaryMaxINR ?? 0
      if (!lo && !hi) return null
      if (lo && hi) return (lo + hi) / 2
      return lo || hi
    })
    .filter((x): x is number => typeof x === 'number' && x > 0)
  return mids
}

// Index: enumerate all (roleSlug, citySlug) combos with non-empty data.
salaryGuidesRouter.get('/', async (_req, res, next) => {
  try {
    const cached = getCached<unknown>('index')
    if (cached) return res.json(cached)

    const jobs = await Job.find({ status: 'open' })
      .select('title city salaryMinINR salaryMaxINR')
      .lean()

    const buckets = new Map<string, { role: string; city: string; count: number }>()
    for (const j of jobs) {
      if (!j.salaryMinINR && !j.salaryMaxINR) continue
      const role = j.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 3).join('-') || 'role'
      const city = (j.city || '').toLowerCase().replace(/\s+/g, '-')
      if (!city) continue
      const key = `${role}|${city}`
      const cur = buckets.get(key) ?? { role, city, count: 0 }
      cur.count++
      buckets.set(key, cur)
    }
    const items = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 100)
    const payload = { items }
    setCached('index', payload)
    res.json(payload)
  } catch (err) {
    next(err)
  }
})

// Detail: aggregated salary distribution for a (role, city) pair
salaryGuidesRouter.get('/:role/:city', async (req, res, next) => {
  try {
    const role = String(req.params.role).toLowerCase()
    const city = String(req.params.city).toLowerCase()
    const cacheKey = `pair:${role}:${city}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) return res.json(cached)

    const roleTokens = role.split('-').filter(Boolean)
    // Match jobs whose title contains any of the role tokens (case-insensitive)
    const titleRegex = new RegExp(roleTokens.map((t) => `(?=.*${t})`).join(''), 'i')

    const jobs = await Job.find({
      status: 'open',
      city: new RegExp(`^${city.replace(/-/g, '\\s')}$`, 'i'),
      title: titleRegex,
    })
      .select('title city company salaryMinINR salaryMaxINR createdAt')
      .lean()

    if (jobs.length === 0) throw new HttpError(404, 'No salary data for this role + city yet')

    const mids = avgOfMidpoints(jobs).sort((a, b) => a - b)
    const median = percentile(mids, 50)
    const p25 = percentile(mids, 25)
    const p75 = percentile(mids, 75)
    const min = mids[0] ?? 0
    const max = mids[mids.length - 1] ?? 0

    // Top companies
    const byCompany = new Map<string, number>()
    for (const j of jobs) byCompany.set(j.company, (byCompany.get(j.company) ?? 0) + 1)
    const topCompanies = [...byCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    // Distribution buckets (10 buckets across [min, max])
    const buckets: number[] = Array(10).fill(0)
    if (max > min) {
      const span = max - min
      for (const m of mids) {
        const idx = Math.min(9, Math.floor(((m - min) / span) * 10))
        buckets[idx]++
      }
    }

    const payload = {
      role,
      city,
      count: jobs.length,
      median,
      p25,
      p75,
      min,
      max,
      distribution: buckets,
      topCompanies,
    }
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (err) {
    next(err)
  }
})
