import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  IndianRupee,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ApplyDialog } from '@/components/ApplyDialog'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatSalaryRange, timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => (await api.get(`/jobs/${id}`)).data.job,
    enabled: !!id,
  })

  if (isLoading) return <div className="container py-12 text-muted-foreground">{t('Loading…')}</div>
  if (!data) return <div className="container py-12">{t('Job not found.')}</div>

  function onApplyClick() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } })
      return
    }
    if (user.role !== 'seeker') {
      alert(t('Only job seekers can apply. Sign in with a seeker account.'))
      return
    }
    setOpen(true)
  }

  return (
    <div className="container py-8 max-w-6xl">
      <Button variant="ghost" asChild className="mb-4 -ml-3 rounded-full">
        <Link to="/jobs">
          <ArrowLeft className="h-4 w-4" /> {t('Back to jobs')}
        </Link>
      </Button>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Main */}
        <Card className="rounded-2xl">
          <CardContent className="p-6 md:p-8">
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">{data.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className="font-medium text-foreground">{data.company}</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {timeAgo(data.createdAt)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <Badge variant={data.workMode === 'remote' ? 'success' : data.workMode === 'hybrid' ? 'info' : 'muted'}>
                {data.workMode}
              </Badge>
              <Badge variant="outline" className="rounded-full">{data.jobType}</Badge>
              {data.visaSponsorship && (
                <Badge variant="info" className="rounded-full">
                  <ShieldCheck className="h-3 w-3 mr-1" /> {t('Visa sponsorship')}
                </Badge>
              )}
            </div>

            <Separator className="my-6" />

            {data.skills && data.skills.length > 0 && (
              <>
                <div className="text-sm font-medium mb-2">{t('Skills required')}</div>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {data.skills.map((s: string) => (
                    <Badge key={s} variant="secondary" className="rounded-full">
                      {s}
                    </Badge>
                  ))}
                </div>
                <Separator className="mb-6" />
              </>
            )}

            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:my-1 prose-a:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.description}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <Button onClick={onApplyClick} className="w-full h-12 rounded-full text-base">
                <Sparkles className="h-4 w-4" /> {t('Apply now')}
              </Button>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info icon={<MapPin className="h-3.5 w-3.5" />} label={t('Location')} value={data.location || data.city} />
                <Info
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  label={t('Experience')}
                  value={`${data.experienceMin}–${data.experienceMax} ${t('years')}`}
                />
                <Info
                  icon={<IndianRupee className="h-3.5 w-3.5" />}
                  label={t('Salary')}
                  value={formatSalaryRange(data.salaryMinINR, data.salaryMaxINR, data.salaryHidden)}
                  className="col-span-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-brand-gradient-soft border-primary/20">
            <CardContent className="p-6">
              <div className="inline-flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> {t('AI match')}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('Sign in and we\'ll show how well your profile matches this role.')}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ApplyDialog jobId={data._id} jobTitle={data.title} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function Info({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  )
}
