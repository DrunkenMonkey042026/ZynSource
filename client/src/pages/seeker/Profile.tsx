import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  User as UserIcon,
  GraduationCap,
  Briefcase,
  Tag,
  IndianRupee,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { useToast } from '@/components/ui/toast'
import { api, apiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface WorkHistory {
  company?: string
  title?: string
  startDate?: string
  endDate?: string
  description?: string
}
interface Education {
  institution?: string
  degree?: string
  year?: string
}
interface ParsePreview {
  headline?: string
  skills?: string[]
  workHistory?: WorkHistory[]
  education?: Education[]
}
interface ProfileData {
  headline?: string
  location?: string
  city?: string
  state?: string
  experienceYears?: number
  currentSalaryINR?: number
  expectedSalaryINR?: number
  skills?: string[]
  workHistory?: WorkHistory[]
  education?: Education[]
  resumeUrl?: string
  visaSponsorshipNeeded?: boolean
  openToRemote?: boolean
  parseStatus?: 'idle' | 'pending' | 'done' | 'failed'
  parsePreview?: ParsePreview
}

type Errors = Partial<Record<'headline' | 'city' | 'experienceYears' | 'skills' | 'expectedSalaryINR', string>>

function validate(form: ProfileData, skillsInput: string): Errors {
  const errs: Errors = {}
  if (!form.headline || form.headline.trim().length < 2) {
    errs.headline = t('Add a short headline (at least 2 characters).')
  }
  if (!form.city || form.city.trim().length < 1) {
    errs.city = t('City is required.')
  }
  if (form.experienceYears == null || Number.isNaN(form.experienceYears) || form.experienceYears < 0) {
    errs.experienceYears = t('Enter your years of experience (0 or more).')
  }
  const parsedSkills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
  if (parsedSkills.length === 0) {
    errs.skills = t('Add at least one skill.')
  }
  if (!form.expectedSalaryINR || form.expectedSalaryINR <= 0) {
    errs.expectedSalaryINR = t('Expected salary is required.')
  }
  return errs
}

function strengthFor(form: ProfileData, skillsInput: string) {
  const checks = [
    !!form.headline?.trim(),
    !!form.city?.trim(),
    form.experienceYears != null,
    skillsInput.split(',').map((s) => s.trim()).filter(Boolean).length > 0,
    !!form.expectedSalaryINR,
    !!form.resumeUrl,
    (form.workHistory ?? []).length > 0,
    (form.education ?? []).length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function RequiredMark() {
  return <span className="text-destructive ml-0.5" aria-hidden>*</span>
}

function SectionHeader({
  icon,
  title,
  accent,
}: {
  icon: React.ReactNode
  title: string
  accent: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm',
          accent,
        )}
      >
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg">{title}</h3>
    </div>
  )
}

export default function SeekerProfile() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await api.get('/profiles/me')).data.profile as ProfileData,
  })

  const [form, setForm] = useState<ProfileData>({})
  const [skillsInput, setSkillsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (data) {
      setForm(data)
      setSkillsInput((data.skills || []).join(', '))
    }
  }, [data])

  useEffect(() => {
    if (!submitted) return
    setErrors(validate(form, skillsInput))
  }, [form, skillsInput, submitted])

  const incompleteOnLoad = useMemo(() => {
    if (!data) return false
    const e = validate(data, (data.skills || []).join(', '))
    return Object.keys(e).length > 0
  }, [data])

  const strength = strengthFor(form, skillsInput)

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    const errs = validate(form, skillsInput)
    setErrors(errs)
    setSubmitted(true)
    if (Object.keys(errs).length > 0) {
      toast({ title: t('Please fix the highlighted fields'), variant: 'error' })
      const firstKey = Object.keys(errs)[0]
      document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSaving(true)
    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      await api.put('/profiles/me', { ...form, skills })
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast({ title: t('Profile saved'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Save failed'), description: apiError(err), variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function uploadResume(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('resume', file)
      const res = await api.post('/profiles/me/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      update('resumeUrl', res.data.resumeUrl)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast({ title: t('Resume uploaded'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Upload failed'), description: apiError(err), variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  function applyParsePreview() {
    if (!form.parsePreview) return
    const p = form.parsePreview
    setForm((prev) => ({
      ...prev,
      headline: p.headline || prev.headline,
      workHistory: p.workHistory && p.workHistory.length ? p.workHistory : prev.workHistory,
      education: p.education && p.education.length ? p.education : prev.education,
      parsePreview: undefined,
    }))
    if (p.skills && p.skills.length) {
      setSkillsInput([...new Set([...skillsInput.split(',').map((s) => s.trim()).filter(Boolean), ...p.skills])].join(', '))
    }
    toast({ title: t('Applied to your profile — review and save'), variant: 'success' })
  }

  if (isLoading) return <div className="container py-12 text-muted-foreground">{t('Loading…')}</div>

  const saveDisabled = saving || (submitted && Object.keys(errors).length > 0)

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader
        title={t('My profile')}
        description={t('Recruiters see what you put here. Make it count.')}
        actions={<Button onClick={save} disabled={saveDisabled} className="rounded-full">{saving ? t('Saving…') : t('Save changes')}</Button>}
      />

      {/* Profile strength */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card p-5 mb-6 relative overflow-hidden"
      >
        <div aria-hidden className="absolute -inset-12 -z-10 bg-brand-gradient-soft blur-3xl opacity-60" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t('Profile strength')}</div>
            <div className="font-display tabular-nums text-3xl font-semibold mt-1">{strength}%</div>
          </div>
          <div className="text-sm text-right text-muted-foreground max-w-xs">
            {strength < 60
              ? t('Complete your profile to unlock AI matching.')
              : strength < 100
              ? t('Almost there! Add work history & education for better matches.')
              : t('Looking great. Recruiters will love this.')}
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-brand-gradient"
          />
        </div>
      </motion.div>

      {incompleteOnLoad && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{t('Complete your profile to apply for jobs.')}</div>
            <div className="text-amber-800 mt-1">
              {t('Fill the fields marked with * to make your profile visible to recruiters.')}
            </div>
          </div>
        </div>
      )}

      {/* Resume dropzone */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5">
          <SectionHeader
            icon={<FileText className="h-5 w-5" />}
            title={t('Resume')}
            accent="bg-gradient-to-br from-indigo-500 to-fuchsia-500"
          />
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) uploadResume(file)
            }}
            onClick={() => fileInput.current?.click()}
            className={cn(
              'mt-4 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
            )}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-medium mt-2">
              {form.resumeUrl ? t('Replace your resume') : t('Drop your resume here, or click to browse')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t('PDF, DOC, or DOCX · up to 5MB')}</div>
            {form.resumeUrl && (
              <div className="mt-3 inline-flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <a
                  className="text-primary hover:underline"
                  href={form.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {form.resumeUrl.split('/').pop()}
                </a>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadResume(file)
              }}
            />
          </div>
          {uploading && <div className="text-xs text-muted-foreground mt-2 text-center">{t('Uploading…')}</div>}

          {/* AI parse preview (shown when API populates parsePreview) */}
          {form.parseStatus === 'pending' && (
            <div className="mt-4 rounded-xl border bg-brand-gradient-soft p-3 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              {t('Reading your resume with AI…')}
            </div>
          )}
          {form.parsePreview && (
            <div className="mt-4 rounded-xl border bg-brand-gradient-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> {t('We extracted from your resume')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Review and apply — you can still edit before saving.')}
                  </p>
                </div>
                <Button onClick={applyParsePreview} size="sm" className="rounded-full">
                  {t('Apply to profile')}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t('skills')} value={form.parsePreview.skills?.length ?? 0} />
                <Stat label={t('jobs')} value={form.parsePreview.workHistory?.length ?? 0} />
                <Stat label={t('degrees')} value={form.parsePreview.education?.length ?? 0} />
                <Stat label={t('headline')} value={form.parsePreview.headline ? 1 : 0} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5 space-y-4">
          <SectionHeader
            icon={<UserIcon className="h-5 w-5" />}
            title={t('About')}
            accent="bg-gradient-to-br from-indigo-500 to-blue-600"
          />
          <div className="space-y-2" data-field="headline">
            <Label>
              {t('Headline')}<RequiredMark />
            </Label>
            <Input
              placeholder={t('e.g. Full-stack developer | React + Node.js')}
              value={form.headline ?? ''}
              onChange={(e) => update('headline', e.target.value)}
              aria-invalid={!!errors.headline}
            />
            {errors.headline && <p className="text-xs text-destructive">{errors.headline}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2" data-field="city">
              <Label>
                {t('City')}<RequiredMark />
              </Label>
              <Input
                value={form.city ?? ''}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Bengaluru"
                aria-invalid={!!errors.city}
              />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('State')}</Label>
              <Input value={form.state ?? ''} onChange={(e) => update('state', e.target.value)} placeholder="Karnataka" />
            </div>
          </div>
          <div className="space-y-2" data-field="experienceYears">
            <Label>
              {t('Years of experience')}<RequiredMark />
            </Label>
            <Input
              type="number"
              min={0}
              value={form.experienceYears ?? ''}
              onChange={(e) => update('experienceYears', e.target.value === '' ? undefined : Number(e.target.value))}
              aria-invalid={!!errors.experienceYears}
              className="max-w-[160px]"
            />
            {errors.experienceYears && <p className="text-xs text-destructive">{errors.experienceYears}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Salary */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5 space-y-4">
          <SectionHeader
            icon={<IndianRupee className="h-5 w-5" />}
            title={t('Compensation')}
            accent="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('Current salary (INR)')}</Label>
              <Input
                type="number"
                min={0}
                value={form.currentSalaryINR ?? ''}
                onChange={(e) => update('currentSalaryINR', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1500000"
              />
            </div>
            <div className="space-y-2" data-field="expectedSalaryINR">
              <Label>
                {t('Expected salary (INR)')}<RequiredMark />
              </Label>
              <Input
                type="number"
                min={0}
                value={form.expectedSalaryINR ?? ''}
                onChange={(e) => update('expectedSalaryINR', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2200000"
                aria-invalid={!!errors.expectedSalaryINR}
              />
              {errors.expectedSalaryINR && <p className="text-xs text-destructive">{errors.expectedSalaryINR}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5 space-y-3" data-field="skills">
          <SectionHeader
            icon={<Tag className="h-5 w-5" />}
            title={t('Skills')}
            accent="bg-gradient-to-br from-fuchsia-500 to-pink-600"
          />
          <Label className="text-sm text-muted-foreground">
            {t('Comma-separated')}<RequiredMark />
          </Label>
          <Input
            placeholder="React, Node.js, TypeScript, AWS"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            aria-invalid={!!errors.skills}
          />
          {errors.skills && <p className="text-xs text-destructive">{errors.skills}</p>}
          <div className="flex flex-wrap gap-1.5">
            {skillsInput
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s, i) => (
                <Badge key={i} variant="secondary" className="rounded-full">{s}</Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Work history */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              icon={<Briefcase className="h-5 w-5" />}
              title={t('Work history')}
              accent="bg-gradient-to-br from-orange-500 to-amber-600"
            />
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => update('workHistory', [...(form.workHistory ?? []), {}])}
            >
              <Plus className="h-3.5 w-3.5" /> {t('Add')}
            </Button>
          </div>
          {(form.workHistory ?? []).map((wh, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t('Company')} value={wh.company ?? ''} onChange={(e) => {
                  const next = [...(form.workHistory ?? [])]
                  next[i] = { ...next[i], company: e.target.value }
                  update('workHistory', next)
                }} />
                <Input placeholder={t('Title')} value={wh.title ?? ''} onChange={(e) => {
                  const next = [...(form.workHistory ?? [])]
                  next[i] = { ...next[i], title: e.target.value }
                  update('workHistory', next)
                }} />
                <Input placeholder={t('Start (YYYY-MM)')} value={wh.startDate ?? ''} onChange={(e) => {
                  const next = [...(form.workHistory ?? [])]
                  next[i] = { ...next[i], startDate: e.target.value }
                  update('workHistory', next)
                }} />
                <Input placeholder={t('End (YYYY-MM or Present)')} value={wh.endDate ?? ''} onChange={(e) => {
                  const next = [...(form.workHistory ?? [])]
                  next[i] = { ...next[i], endDate: e.target.value }
                  update('workHistory', next)
                }} />
              </div>
              <Textarea placeholder={t('What did you do?')} value={wh.description ?? ''} onChange={(e) => {
                const next = [...(form.workHistory ?? [])]
                next[i] = { ...next[i], description: e.target.value }
                update('workHistory', next)
              }} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = [...(form.workHistory ?? [])]
                  next.splice(i, 1)
                  update('workHistory', next)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('Remove')}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Education */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              icon={<GraduationCap className="h-5 w-5" />}
              title={t('Education')}
              accent="bg-gradient-to-br from-sky-500 to-cyan-600"
            />
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => update('education', [...(form.education ?? []), {}])}
            >
              <Plus className="h-3.5 w-3.5" /> {t('Add')}
            </Button>
          </div>
          {(form.education ?? []).map((ed, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Input placeholder={t('Institution')} value={ed.institution ?? ''} onChange={(e) => {
                const next = [...(form.education ?? [])]
                next[i] = { ...next[i], institution: e.target.value }
                update('education', next)
              }} />
              <Input placeholder={t('Degree')} value={ed.degree ?? ''} onChange={(e) => {
                const next = [...(form.education ?? [])]
                next[i] = { ...next[i], degree: e.target.value }
                update('education', next)
              }} />
              <div className="flex gap-2">
                <Input placeholder={t('Year')} value={ed.year ?? ''} onChange={(e) => {
                  const next = [...(form.education ?? [])]
                  next[i] = { ...next[i], year: e.target.value }
                  update('education', next)
                }} />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const next = [...(form.education ?? [])]
                    next.splice(i, 1)
                    update('education', next)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saveDisabled} size="lg" className="rounded-full">
          {saving ? t('Saving…') : t('Save changes')}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/60 p-2 text-center">
      <div className="font-display tabular-nums text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}
