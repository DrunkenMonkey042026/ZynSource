import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Users, FileSpreadsheet, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bento } from '@/components/Bento'
import { BentoCard } from '@/components/BentoCard'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { Sparkline } from '@/components/Sparkline'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

interface Stats {
  totalJobs: number
  openJobs: number
  totalApplicants: number
  statusBreakdown: Record<string, number>
}

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

// Synthetic 14-day trend so cards have life until we wire real activity.
function trendFor(seed: number) {
  const base = Math.max(2, seed)
  const arr: number[] = []
  for (let i = 0; i < 14; i++) {
    const noise = Math.sin(i * 0.7 + seed) * 1.6 + Math.cos(i * 0.4) * 1.2
    arr.push(Math.max(0, Math.round(base * 0.4 + noise + (i / 14) * base * 0.5)))
  }
  return arr
}

export default function RecruiterDashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-stats'],
    queryFn: async () => (await api.get<Stats>('/recruiter/stats')).data,
  })

  const totalJobs = data?.totalJobs ?? 0
  const openJobs = data?.openJobs ?? 0
  const totalApplicants = data?.totalApplicants ?? 0
  const interviewing = data?.statusBreakdown.interview ?? 0

  return (
    <div className="container max-w-6xl py-8">
      <PageHeader
        title={`${t('Welcome')}, ${user?.name?.split(' ')[0] ?? ''} 👋`}
        description={t('Here\'s what\'s happening with your hiring.')}
        actions={
          <Button asChild className="rounded-full">
            <Link to="/recruiter/jobs/new">
              <Plus className="h-4 w-4" /> {t('Post a job')}
            </Link>
          </Button>
        }
      />

      <Bento>
        <BentoCard span="1x1" pattern="dots">
          <div className="flex flex-col h-full justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" /> {t('Open jobs')}
            </div>
            <div className="font-display tabular-nums text-4xl font-semibold leading-none">
              {isLoading ? '—' : <AnimatedCounter to={openJobs} />}
            </div>
            <div className="text-xs text-muted-foreground">{totalJobs} {t('total')}</div>
          </div>
        </BentoCard>

        <BentoCard span="1x1">
          <div className="flex flex-col h-full justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {t('Applicants')}
            </div>
            <div className="font-display tabular-nums text-4xl font-semibold leading-none">
              {isLoading ? '—' : <AnimatedCounter to={totalApplicants} />}
            </div>
            <div>
              <Sparkline data={trendFor(totalApplicants || 5)} />
              <div className="text-xs text-muted-foreground mt-1">{t('last 14 days')}</div>
            </div>
          </div>
        </BentoCard>

        <BentoCard span="1x1">
          <div className="flex flex-col h-full justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" /> {t('Interviewing')}
            </div>
            <div className="font-display tabular-nums text-4xl font-semibold leading-none">
              {isLoading ? '—' : <AnimatedCounter to={interviewing} />}
            </div>
            <div>
              <Sparkline data={trendFor(interviewing || 2)} stroke="hsl(var(--grad-via))" fill="hsl(var(--grad-via) / 0.12)" />
            </div>
          </div>
        </BentoCard>

        <BentoCard span="1x1" gradient pattern="glow">
          <div className="flex flex-col h-full justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> {t('AI insights')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('Sort applicants by AI match in any job\'s applicants view.')}
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-full self-start">
              <Link to="/recruiter/jobs">{t('Open jobs')}</Link>
            </Button>
          </div>
        </BentoCard>

        {/* Pipeline overview */}
        <BentoCard span="2x1" pattern="grid">
          <div className="flex flex-col h-full">
            <div className="text-sm font-medium">{t('Pipeline overview')}</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 flex-1">
              {(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const).map((s) => (
                <div key={s} className="rounded-xl border bg-background/60 backdrop-blur p-3 text-center">
                  <div className="font-display tabular-nums text-2xl font-semibold">
                    {data?.statusBreakdown?.[s] ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {t(STATUS_LABELS[s])}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        <BentoCard span="2x1">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="font-display font-semibold text-lg">{t('Manage your jobs')}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('See applicants, update statuses, and run your ATS pipeline.')}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full self-start">
              <Link to="/recruiter/jobs">{t('View all jobs')}</Link>
            </Button>
          </div>
        </BentoCard>
      </Bento>
    </div>
  )
}
