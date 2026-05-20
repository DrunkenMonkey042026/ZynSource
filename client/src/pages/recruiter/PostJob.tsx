import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles, Languages } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useToast } from '@/components/ui/toast'
import { api, apiError } from '@/lib/api'
import { t } from '@/lib/i18n'

const schema = z.object({
  title: z.string().min(2),
  company: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  location: z.string().optional(),
  workMode: z.enum(['onsite', 'hybrid', 'remote']),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  experienceMin: z.coerce.number().min(0),
  experienceMax: z.coerce.number().min(0),
  salaryMinINR: z.string().optional(),
  salaryMaxINR: z.string().optional(),
  salaryHidden: z.boolean().optional(),
  visaSponsorship: z.boolean().optional(),
  description: z.string().min(10, 'Please write at least a short description'),
  descriptionHi: z.string().optional(),
  skills: z.string().optional(),
  screeningEnabled: z.boolean().optional(),
  screeningPromptHint: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RecruiterPostJob() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [showHindi, setShowHindi] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', company: '', city: '', state: '', location: '',
      workMode: 'onsite', jobType: 'full-time',
      experienceMin: 0, experienceMax: 3,
      salaryMinINR: '', salaryMaxINR: '',
      salaryHidden: false, visaSponsorship: false,
      description: '', descriptionHi: '', skills: '',
      screeningEnabled: false, screeningPromptHint: '',
    },
  })

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    try {
      const skills = (values.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      const languagesSupported = ['en']
      if (values.descriptionHi && values.descriptionHi.trim().length > 10) languagesSupported.push('hi')
      await api.post('/jobs', {
        ...values,
        salaryMinINR: values.salaryMinINR ? Number(values.salaryMinINR) : undefined,
        salaryMaxINR: values.salaryMaxINR ? Number(values.salaryMaxINR) : undefined,
        skills,
        languagesSupported,
      })
      toast({
        title: t('Job posted'),
        description: values.screeningEnabled
          ? t('AI screening questions are being generated — they\'ll appear shortly.')
          : undefined,
        variant: 'success',
      })
      navigate('/recruiter/jobs')
    } catch (err) {
      toast({ title: t('Could not post job'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function polishDescription() {
    const title = form.getValues('title')
    const draft = form.getValues('description')
    if (!title.trim() || draft.trim().length < 20) {
      toast({ title: t('Add a title and at least a short draft first'), variant: 'error' })
      return
    }
    setPolishing(true)
    try {
      const res = await api.post<{ polished: string }>('/ai/polish-jd', { title, draft })
      form.setValue('description', res.data.polished, { shouldDirty: true })
      toast({ title: t('Polished! Review and edit before posting.'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Could not polish'), description: apiError(err), variant: 'error' })
    } finally {
      setPolishing(false)
    }
  }

  async function translateToHindi() {
    const desc = form.getValues('description')
    if (desc.trim().length < 10) {
      toast({ title: t('Write the English description first'), variant: 'error' })
      return
    }
    try {
      const res = await api.post<{ translation: string }>('/ai/translate-hi', { text: desc })
      form.setValue('descriptionHi', res.data.translation, { shouldDirty: true })
      setShowHindi(true)
      toast({ title: t('Translated to Hindi'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Translation failed'), description: apiError(err), variant: 'error' })
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title={t('Post a job')} description={t('Fill in the details. You can edit later.')} />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t('Job title')} error={form.formState.errors.title?.message}>
                <Input placeholder={t('Senior React Engineer')} {...form.register('title')} />
              </Field>
              <Field label={t('Company')} error={form.formState.errors.company?.message}>
                <Input placeholder="Acme Corp" {...form.register('company')} />
              </Field>
              <Field label={t('City')} error={form.formState.errors.city?.message}>
                <Input placeholder="Bengaluru" {...form.register('city')} />
              </Field>
              <Field label={t('State (optional)')}>
                <Input placeholder="Karnataka" {...form.register('state')} />
              </Field>
              <Field label={t('Location (optional)')}>
                <Input placeholder="Koramangala" {...form.register('location')} />
              </Field>
              <Field label={t('Work mode')}>
                <Select
                  defaultValue={form.getValues('workMode')}
                  onValueChange={(v) => form.setValue('workMode', v as 'onsite' | 'hybrid' | 'remote')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onsite">{t('On-site')}</SelectItem>
                    <SelectItem value="hybrid">{t('Hybrid')}</SelectItem>
                    <SelectItem value="remote">{t('Remote')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('Job type')}>
                <Select
                  defaultValue={form.getValues('jobType')}
                  onValueChange={(v) => form.setValue('jobType', v as 'full-time' | 'part-time' | 'contract' | 'internship')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{t('Full-time')}</SelectItem>
                    <SelectItem value="part-time">{t('Part-time')}</SelectItem>
                    <SelectItem value="contract">{t('Contract')}</SelectItem>
                    <SelectItem value="internship">{t('Internship')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('Min experience (years)')}>
                <Input type="number" min={0} {...form.register('experienceMin')} />
              </Field>
              <Field label={t('Max experience (years)')}>
                <Input type="number" min={0} {...form.register('experienceMax')} />
              </Field>
              <Field label={t('Min salary (INR / year)')}>
                <Input type="number" min={0} placeholder="1500000" {...form.register('salaryMinINR')} />
              </Field>
              <Field label={t('Max salary (INR / year)')}>
                <Input type="number" min={0} placeholder="3000000" {...form.register('salaryMaxINR')} />
              </Field>
            </div>

            <Field label={t('Skills (comma-separated)')}>
              <Input placeholder="React, Node.js, MongoDB" {...form.register('skills')} />
            </Field>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t('Description')}</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={polishDescription} disabled={polishing}>
                    <Sparkles className="h-3.5 w-3.5" /> {polishing ? t('Polishing…') : t('Improve with AI')}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={translateToHindi}>
                    <Languages className="h-3.5 w-3.5" /> {t('Translate to Hindi')}
                  </Button>
                </div>
              </div>
              <Textarea rows={12} placeholder={t('What will the candidate do? What are you looking for?')} {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {showHindi && (
              <Field label={t('Hindi description (optional — shown to Hindi-locale users)')}>
                <Textarea rows={10} placeholder="हिन्दी विवरण…" {...form.register('descriptionHi')} />
              </Field>
            )}
            {!showHindi && (
              <button
                type="button"
                onClick={() => setShowHindi(true)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Languages className="h-3 w-3" /> {t('Add a Hindi version')}
              </button>
            )}

            <div className="rounded-2xl border bg-brand-gradient-soft p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  {...form.register('screeningEnabled')}
                />
                <div>
                  <div className="font-medium inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> {t('Add AI screening questions')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("We'll auto-generate 3 role-specific questions. Each applicant answers them, and AI scores fairly using the same rubric.")}
                  </p>
                </div>
              </label>
              <Field label={t('Screening hint (optional)')}>
                <Input
                  placeholder={t('e.g. "Test for ownership, Indian-market experience, and ability to translate ambiguity"')}
                  {...form.register('screeningPromptHint')}
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register('salaryHidden')} /> {t('Hide salary from candidates')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register('visaSponsorship')} /> {t('We can sponsor visas')}
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate('/recruiter/jobs')}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-full">
                {submitting ? t('Posting…') : t('Post job')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
