import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Users, Briefcase, MapPin, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Job {
  _id: string
  title: string
  company: string
  city: string
  workMode: 'onsite' | 'hybrid' | 'remote'
  status: 'open' | 'closed' | 'draft'
  applicationCount: number
  createdAt: string
}

export default function RecruiterMyJobs() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: async () => (await api.get<{ items: Job[] }>('/recruiter/jobs')).data.items,
  })

  async function deleteJob(id: string) {
    if (!confirm(t('Delete this job? Applicants will lose visibility into their application.'))) return
    try {
      await api.delete(`/jobs/${id}`)
      qc.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      qc.invalidateQueries({ queryKey: ['recruiter-stats'] })
      toast({ title: t('Job deleted'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Delete failed'), description: apiError(err), variant: 'error' })
    }
  }

  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        title={t('My jobs')}
        description={t('All the roles you\'ve posted.')}
        actions={
          <Button asChild>
            <Link to="/recruiter/jobs/new">
              <Plus className="h-4 w-4" /> {t('Post a job')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('Loading…')}</CardContent></Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('No jobs posted yet.')}</p>
            <Button asChild className="mt-4">
              <Link to="/recruiter/jobs/new">{t('Post your first job')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((job) => (
            <Card key={job._id}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/recruiter/jobs/${job._id}/applicants`} className="font-semibold hover:text-primary">
                      {job.title}
                    </Link>
                    <Badge variant={job.status === 'open' ? 'success' : 'muted'}>{job.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> {job.company}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {job.city} ({job.workMode})
                    </span>
                    <span>{t('Posted')} {timeAgo(job.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/recruiter/jobs/${job._id}/applicants`}>
                      <Users className="h-4 w-4" /> {job.applicationCount} {t('applicants')}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteJob(job._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
