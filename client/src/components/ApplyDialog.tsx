import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScreeningQuestionsForm } from '@/components/ScreeningQuestionsForm'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'

interface Props {
  jobId: string
  jobTitle: string
  screeningQuestions?: string[]
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
  resumeKey?: string
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

export function ApplyDialog({ jobId, jobTitle, screeningQuestions = [], open, onOpenChange }: Props) {
  const [coverLetter, setCoverLetter] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    if (open) setAnswers(new Array(screeningQuestions.length).fill(''))
  }, [open, screeningQuestions.length])

  const profile = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await api.get('/profiles/me')).data.profile as Profile,
    enabled: open,
  })

  const hasResume = !!(profile.data?.resumeKey || profile.data?.resumeUrl)
  const profileMissing = missingFields(profile.data)
  const allAnswered = screeningQuestions.length === 0 || answers.every((a) => a.trim().length > 0)
  const blocked = !hasResume || profileMissing.length > 0
  const canSubmit = !blocked && allAnswered && !submitting

  async function submit() {
    setSubmitting(true)
    try {
      await api.post('/applications', { jobId, coverLetter, screeningAnswers: answers })
      toast({
        title: t('Application submitted!'),
        description: screeningQuestions.length > 0
          ? t('AI is scoring your answers — the recruiter will see results shortly.')
          : t('Track its status under My applications.'),
        variant: 'success',
      })
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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Apply to')} {jobTitle}</DialogTitle>
          <DialogDescription>
            {t('Your profile and resume will be sent to the recruiter.')}
          </DialogDescription>
        </DialogHeader>

        {!hasResume ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm">
            <div className="font-medium text-amber-900">{t('Resume required')}</div>
            <div className="text-amber-800 mt-1">{t('Upload your resume on your profile before applying.')}</div>
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
            <div className="text-amber-800 mt-2">{t('Missing:')} {profileMissing.join(', ')}</div>
            <Button variant="outline" size="sm" className="mt-3" onClick={goToProfile}>
              {t('Go to profile')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm">
              <div className="text-muted-foreground">{t('Resume on file')}</div>
              <a
                className="text-primary hover:underline"
                href={profile.data?.resumeUrl}
                target="_blank"
                rel="noreferrer"
              >
                {profile.data?.resumeUrl?.split('/').pop()?.split('?')[0] ?? t('View')}
              </a>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover">{t('Cover letter (optional)')}</Label>
              <Textarea
                id="cover"
                rows={4}
                placeholder={t("Tell the recruiter why you're a great fit…")}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
            <ScreeningQuestionsForm questions={screeningQuestions} answers={answers} onChange={setAnswers} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          {!blocked && (
            <Button onClick={submit} disabled={!canSubmit}>
              {submitting ? t('Submitting…') : t('Submit application')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
