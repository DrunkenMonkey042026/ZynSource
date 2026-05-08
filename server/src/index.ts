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

app.use(errorHandler)

async function start() {
  await connectDB()
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`)
  })
}

start().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
