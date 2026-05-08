import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, MapPin, Clock, IndianRupee, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MatchScoreBadge } from '@/components/MatchScoreBadge'
import { formatSalaryRange, timeAgo } from '@/lib/utils'

export interface JobSummary {
  _id: string
  title: string
  company: string
  city: string
  workMode: 'onsite' | 'hybrid' | 'remote'
  jobType: string
  experienceMin?: number
  experienceMax?: number
  salaryMinINR?: number
  salaryMaxINR?: number
  salaryHidden?: boolean
  skills?: string[]
  createdAt: string
  matchScore?: number
}

const workModeTone: Record<string, 'success' | 'info' | 'muted'> = {
  remote: 'success',
  hybrid: 'info',
  onsite: 'muted',
}

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link to={`/jobs/${job._id}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="rounded-2xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-glow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                {job.title}
              </h3>
              <MatchScoreBadge score={job.matchScore} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Building2 className="h-3.5 w-3.5" />
              {job.company}
            </div>
          </div>
          <Badge variant={workModeTone[job.workMode] ?? 'muted'} className="shrink-0">
            {job.workMode}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-4">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {job.city}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {job.experienceMin ?? 0}–{job.experienceMax ?? 0} yrs
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <IndianRupee className="h-3.5 w-3.5" />
            {formatSalaryRange(job.salaryMinINR, job.salaryMaxINR, job.salaryHidden)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo(job.createdAt)}
          </span>
        </div>

        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {job.skills.slice(0, 5).map((s) => (
              <Badge key={s} variant="outline" className="text-xs rounded-full">
                {s}
              </Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="outline" className="text-xs rounded-full">
                +{job.skills.length - 5}
              </Badge>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  )
}
