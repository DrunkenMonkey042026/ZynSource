import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, MapPin, Filter as FilterIcon, X, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JobCard, type JobSummary } from '@/components/JobCard'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Filters {
  q: string
  city: string
  skills: string
  jobType: string
  workMode: string
  expMin: string
  salaryMin: string
}

const empty: Filters = { q: '', city: '', skills: '', jobType: 'any', workMode: 'any', expMin: '', salaryMin: '' }

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    city: params.get('city') ?? '',
    skills: params.get('skills') ?? '',
    jobType: params.get('jobType') ?? 'any',
    workMode: params.get('workMode') ?? 'any',
    expMin: params.get('expMin') ?? '',
    salaryMin: params.get('salaryMin') ?? '',
  }
}

export default function Jobs() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const [draft, setDraft] = useState<Filters>(filters)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => setDraft(filters), [filters])

  function applyDraft(next?: Partial<Filters>) {
    const merged = { ...draft, ...(next ?? {}) }
    setDraft(merged)
    const sp = new URLSearchParams()
    if (merged.q.trim()) sp.set('q', merged.q.trim())
    if (merged.city.trim()) sp.set('city', merged.city.trim())
    if (merged.skills.trim()) sp.set('skills', merged.skills.trim())
    if (merged.jobType && merged.jobType !== 'any') sp.set('jobType', merged.jobType)
    if (merged.workMode && merged.workMode !== 'any') sp.set('workMode', merged.workMode)
    if (merged.expMin.trim()) sp.set('expMin', merged.expMin.trim())
    if (merged.salaryMin.trim()) sp.set('salaryMin', merged.salaryMin.trim())
    setParams(sp)
  }

  function reset() {
    setDraft(empty)
    setParams(new URLSearchParams())
  }

  const queryParams = useMemo(() => {
    const out: Record<string, string> = {}
    if (filters.q) out.q = filters.q
    if (filters.city) out.city = filters.city
    if (filters.skills) out.skills = filters.skills
    if (filters.jobType && filters.jobType !== 'any') out.jobType = filters.jobType
    if (filters.workMode && filters.workMode !== 'any') out.workMode = filters.workMode
    if (filters.expMin) out.expMin = filters.expMin
    if (filters.salaryMin) out.salaryMin = filters.salaryMin
    return out
  }, [filters])

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', queryParams],
    queryFn: async () => {
      const res = await api.get<{ items: JobSummary[]; total: number }>('/jobs', { params: queryParams })
      return res.data
    },
  })

  const activeChips: { label: string; key: keyof Filters }[] = []
  if (filters.q) activeChips.push({ label: `"${filters.q}"`, key: 'q' })
  if (filters.city) activeChips.push({ label: filters.city, key: 'city' })
  if (filters.skills)
    filters.skills.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) =>
      activeChips.push({ label: s, key: 'skills' }),
    )
  if (filters.jobType !== 'any') activeChips.push({ label: filters.jobType, key: 'jobType' })
  if (filters.workMode !== 'any') activeChips.push({ label: filters.workMode, key: 'workMode' })
  if (filters.expMin) activeChips.push({ label: `${filters.expMin}+ yrs`, key: 'expMin' })
  if (filters.salaryMin) activeChips.push({ label: `≥ ₹${(Number(filters.salaryMin) / 100000).toFixed(1)}L`, key: 'salaryMin' })

  function clearChip(key: keyof Filters) {
    if (key === 'jobType' || key === 'workMode') applyDraft({ [key]: 'any' } as Partial<Filters>)
    else applyDraft({ [key]: '' } as Partial<Filters>)
  }

  return (
    <div className="container py-8">
      {/* Search bar */}
      <div className="rounded-2xl border bg-card p-4 sticky top-16 z-30 backdrop-blur-md bg-card/95">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 h-11 rounded-full"
              placeholder={t('Job title, skill, or company')}
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
            />
          </div>
          <div className="relative md:w-72">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 h-11 rounded-full"
              placeholder={t('City')}
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
            />
          </div>
          <Button onClick={() => applyDraft()} className="h-11 rounded-full px-6">
            {t('Search')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn('h-11 rounded-full', moreOpen && 'bg-primary/5 border-primary/40')}
          >
            <FilterIcon className="h-4 w-4" /> {t('Filters')}
            <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
          </Button>
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {activeChips.map((c, i) => (
              <Badge key={`${c.key}-${i}`} variant="secondary" className="rounded-full pr-1">
                {c.label}
                <button
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-foreground/10"
                  onClick={() => clearChip(c.key)}
                  aria-label="Remove filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline ml-2">
              {t('Clear all')}
            </button>
          </div>
        )}

        {/* Expanded filter panel */}
        {moreOpen && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="space-y-1">
              <Label className="text-xs">{t('Skills (comma-separated)')}</Label>
              <Input
                placeholder="React, Node.js"
                value={draft.skills}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('Job type')}</Label>
              <Select value={draft.jobType} onValueChange={(v) => applyDraft({ jobType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('Any')}</SelectItem>
                  <SelectItem value="full-time">{t('Full-time')}</SelectItem>
                  <SelectItem value="part-time">{t('Part-time')}</SelectItem>
                  <SelectItem value="contract">{t('Contract')}</SelectItem>
                  <SelectItem value="internship">{t('Internship')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('Work mode')}</Label>
              <Select value={draft.workMode} onValueChange={(v) => applyDraft({ workMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('Any')}</SelectItem>
                  <SelectItem value="onsite">{t('On-site')}</SelectItem>
                  <SelectItem value="hybrid">{t('Hybrid')}</SelectItem>
                  <SelectItem value="remote">{t('Remote')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('Min exp (yrs)')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.expMin}
                  onChange={(e) => setDraft({ ...draft, expMin: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('Min salary')}</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500000"
                  value={draft.salaryMin}
                  onChange={(e) => setDraft({ ...draft, salaryMin: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="font-display text-2xl font-semibold">
            {isLoading ? t('Searching…') : `${data?.total ?? 0} ${t('jobs found')}`}
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-2xl p-6">
                <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded mt-3" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded mt-3" />
              </Card>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              {t('No jobs match your filters. Try broadening your search.')}
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
            className="space-y-3"
          >
            {data.items.map((job) => (
              <motion.div
                key={job._id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  )
}
