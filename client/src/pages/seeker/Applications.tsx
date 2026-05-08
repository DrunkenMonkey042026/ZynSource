import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge, type AppStatus } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Application {
  _id: string
  status: AppStatus
  createdAt: string
  jobId: {
    _id: string
    title: string
    company: string
    city: string
    workMode: string
  } | null
}

export default function SeekerApplications() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: async () => (await api.get<{ items: Application[] }>('/applications/mine')).data.items,
  })

  return (
    <div className="container max-w-4xl py-8">
      <PageHeader
        title={t('My applications')}
        description={t('Track every job you\'ve applied to.')}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="h-5 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded mt-3" />
            </Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('You haven\'t applied to any jobs yet.')}</p>
            <Button asChild className="mt-4">
              <Link to="/jobs">{t('Browse jobs')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((app) => (
            <Card key={app._id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {app.jobId ? (
                    <Link to={`/jobs/${app.jobId._id}`} className="font-semibold hover:text-primary">
                      {app.jobId.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-muted-foreground">{t('Job removed')}</span>
                  )}
                  {app.jobId && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> {app.jobId.company}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {app.jobId.city}
                      </span>
                      <span>{t('Applied')} {timeAgo(app.createdAt)}</span>
                    </div>
                  )}
                </div>
                <StatusBadge status={app.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
