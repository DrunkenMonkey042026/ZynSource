import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './lib/env.js'
import { connectDB } from './lib/db.js'
import { errorHandler } from './middleware/error.js'
import { authRouter } from './routes/auth.js'
import { jobsRouter } from './routes/jobs.js'
import { profilesRouter } from './routes/profiles.js'
import { applicationsRouter } from './routes/applications.js'
import { recruiterRouter } from './routes/recruiter.js'
import { matchRouter } from './routes/match.js'
import { companiesRouter } from './routes/companies.js'
import { reviewsRouter } from './routes/reviews.js'
import { salaryGuidesRouter } from './routes/salary-guides.js'
import { postsRouter } from './routes/posts.js'
import { adminRouter } from './routes/admin.js'
import { seoRouter } from './routes/seo.js'
import { notificationsRouter } from './routes/notifications.js'
import { savedSearchesRouter } from './routes/saved-searches.js'
import { alertsRouter } from './routes/alerts.js'
import { chatRouter } from './routes/chat.js'
import { aiToolsRouter } from './routes/ai-tools.js'
import { startCron } from './lib/cron.js'

const app = express()

app.use(cors({ origin: env.CLIENT_URL, credentials: false }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'zynsource-api' }))

app.use('/api/auth', authRouter)
app.use('/api/jobs', jobsRouter)
app.use('/api/profiles', profilesRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/recruiter', recruiterRouter)
app.use('/api/match', matchRouter)

// Phase 2B
app.use('/api/companies', companiesRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/salary-guides', salaryGuidesRouter)
app.use('/api/posts', postsRouter)
app.use('/api/admin', adminRouter)
// SEO endpoints are mounted at root, not /api
app.use('/', seoRouter)

// Phase 2C
app.use('/api/notifications', notificationsRouter)
app.use('/api/saved-searches', savedSearchesRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/chat', chatRouter)
app.use('/api/ai', aiToolsRouter)

app.use(errorHandler)

async function start() {
  await connectDB()
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`)
  })
  startCron()
}

start().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
