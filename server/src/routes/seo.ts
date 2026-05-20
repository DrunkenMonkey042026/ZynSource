import { Router } from 'express'
import { Job } from '../models/Job.js'
import { Company } from '../models/Company.js'
import { Post } from '../models/Post.js'
import { env } from '../lib/env.js'

export const seoRouter = Router()

function xmlEscape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

seoRouter.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const base = env.CLIENT_URL.replace(/\/+$/, '')
    const urls: { loc: string; lastmod?: Date }[] = [
      { loc: `${base}/` },
      { loc: `${base}/jobs` },
      { loc: `${base}/companies` },
      { loc: `${base}/salary-guides` },
      { loc: `${base}/blog` },
    ]

    const [jobs, companies, posts] = await Promise.all([
      Job.find({ status: 'open' }).select('_id updatedAt').lean(),
      Company.find().select('slug updatedAt').lean(),
      Post.find({ status: 'published' }).select('slug publishedAt updatedAt').lean(),
    ])

    for (const j of jobs) urls.push({ loc: `${base}/jobs/${j._id}`, lastmod: j.updatedAt as Date })
    for (const c of companies) urls.push({ loc: `${base}/companies/${c.slug}`, lastmod: c.updatedAt as Date })
    for (const p of posts) {
      urls.push({ loc: `${base}/blog/${p.slug}`, lastmod: (p.publishedAt || p.updatedAt) as Date })
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>`

    res.type('application/xml').send(body)
  } catch (err) {
    next(err)
  }
})

seoRouter.get('/robots.txt', (_req, res) => {
  const base = env.CLIENT_URL.replace(/\/+$/, '')
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`)
})
