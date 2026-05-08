import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  skills: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RecruiterPostJob() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      company: '',
      city: '',
      state: '',
      location: '',
      workMode: 'onsite',
      jobType: 'full-time',
      experienceMin: 0,
      experienceMax: 3,
      salaryMinINR: '',
      salaryMaxINR: '',
      salaryHidden: false,
      visaSponsorship: false,
      description: '',
      skills: '',
    },
  })

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    try {
      const skills = (values.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await api.post('/jobs', {
        ...values,
        salaryMinINR: values.salaryMinINR ? Number(values.salaryMinINR) : undefined,
        salaryMaxINR: values.salaryMaxINR ? Number(values.salaryMaxINR) : undefined,
        skills,
      })
      toast({ title: t('Job posted'), variant: 'success' })
      navigate('/recruiter/jobs')
    } catch (err) {
      toast({ title: t('Could not post job'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title={t('Post a job')} description={t('Fill in the details. You can edit later.')} />

      <Card>
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

            <Field label={t('Description')} error={form.formState.errors.description?.message}>
              <Textarea rows={10} placeholder={t('What will the candidate do? What are you looking for?')} {...form.register('description')} />
            </Field>

            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register('salaryHidden')} /> {t('Hide salary from candidates')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register('visaSponsorship')} /> {t('We can sponsor visas')}
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/recruiter/jobs')}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
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
