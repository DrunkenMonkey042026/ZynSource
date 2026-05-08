import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'

interface Props {
  jobId: string
  jobTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Profile {
  headline?: string
  city?: string
  experienceYears?: number
  skills?: string[]
  expectedSalaryINR?: number
  resumeUrl?: string
}

function missingFields(p: Profile | undefined) {
  const missing: string[] = []
  if (!p?.headline?.trim()) missing.push(t('headline'))
  if (!p?.city?.trim()) missing.push(t('city'))
  if (p?.experienceYears == null) missing.push(t('years of experience'))
  if (!p?.skills || p.skills.length === 0) missing.push(t('skills'))
  if (!p?.expectedSalaryINR) missing.push(t('expected salary'))
  return missing
}

export function ApplyDialog({ jobId, jobTitle, open, onOpenChange }: Props) {
  const [coverLetter, setCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const profile = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await api.get('/profiles/me')).data.profile as Profile,
    enabled: open,
  })

  const hasResume = !!profile.data?.resumeUrl
  const profileMissing = missingFields(profile.data)
  const blocked = !hasResume || profileMissing.length > 0

  async function submit() {
    setSubmitting(true)
    try {
      await api.post('/applications', { jobId, coverLetter })
      toast({ title: t('Application submitted!'), description: t('Track its status under My applications.'), variant: 'success' })
      qc.invalidateQueries({ queryKey: ['my-applications'] })
      onOpenChange(false)
      setCoverLetter('')
    } catch (err) {
      toast({ title: t('Could not apply'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function goToProfile() {
    onOpenChange(false)
    navigate('/me/profile')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Apply to')} {jobTitle}</DialogTitle>
          <DialogDescription>
            {t('Your profile and resume will be sent to the recruiter.')}
          </DialogDescription>
        </DialogHeader>

        {!hasResume ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm">
            <div className="font-medium text-amber-900">{t('Resume required')}</div>
            <div className="text-amber-800 mt-1">
              {t('Upload your resume on your profile before applying.')}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={goToProfile}>
              {t('Go to profile')}
            </Button>
          </div>
        ) : profileMissing.length > 0 ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm">
            <div className="font-medium text-amber-900">{t('Your profile is incomplete')}</div>
            <div className="text-amber-800 mt-1">
              {t('Recruiters need a headline, city, experience, skills and expected salary before you can apply.')}
            </div>
            <div className="text-amber-800 mt-2">
              {t('Missing:')} {profileMissing.join(', ')}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={goToProfile}>
              {t('Go to profile')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">{t('Resume on file')}</div>
              <a
                className="text-primary hover:underline"
                href={profile.data?.resumeUrl}
                target="_blank"
                rel="noreferrer"
              >
                {profile.data?.resumeUrl?.split('/').pop()}
              </a>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover">{t('Cover letter (optional)')}</Label>
              <Textarea
                id="cover"
                rows={6}
                placeholder={t('Tell the recruiter why you\'re a great fit…')}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          {!blocked && (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t('Submitting…') : t('Submit application')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
