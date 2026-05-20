import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ArrowLeft, FileText, MessageSquarePlus, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/PageHeader'
import { MatchScoreBadge } from '@/components/MatchScoreBadge'
import { ScreeningScorePanel } from '@/components/ScreeningScorePanel'
import { ApplicationTimeline } from '@/components/ApplicationTimeline'
import { STATUS_ORDER, STATUS_LABELS, type AppStatus } from '@/components/StatusBadge'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { cn, formatINR, timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Note {
  _id?: string
  text: string
  createdAt: string
}
interface StatusEntry { from?: string; to?: string; at?: string }
interface RubricEntry { questionIndex: number; score: number; rationale: string }
interface Applicant {
  _id: string
  status: AppStatus
  coverLetter: string
  resumeUrlSnapshot: string
  notes: Note[]
  statusHistory: StatusEntry[]
  createdAt: string
  matchScore?: number
  screeningStatus?: 'none' | 'pending' | 'done' | 'failed'
  screeningScore?: number
  screeningAnswers: string[]
  screeningRubric: RubricEntry[]
  seeker: { _id: string; name: string; email: string } | null
  profile: {
    headline?: string
    city?: string
    experienceYears?: number
    expectedSalaryINR?: number
    skills?: string[]
  } | null
}

type SortMode = 'recent' | 'match' | 'screening'

function ApplicantCard({ app, onClick }: { app: Applicant; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app._id, data: { app } })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : 'auto' as const }
    : undefined
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={onClick}
      className={cn(
        'rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors touch-none',
        isDragging && 'shadow-glow opacity-90',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div aria-hidden className="h-7 w-7 rounded-full bg-brand-gradient flex-none ring-2 ring-background shadow-sm" />
          <div className="font-medium text-sm truncate">{app.seeker?.name ?? t('Unknown')}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MatchScoreBadge score={app.matchScore} />
          {app.screeningStatus === 'done' && app.screeningScore != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full ring-1 bg-primary/10 text-primary ring-primary/20 px-2 py-0.5 text-[10px] font-semibold">
              <Sparkles className="h-2.5 w-2.5" />
              {app.screeningScore}%
            </span>
          )}
          {app.screeningStatus === 'pending' && (
            <span className="text-[10px] text-muted-foreground italic">{t('Scoring…')}</span>
          )}
        </div>
      </div>
      {app.profile?.headline && (
        <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{app.profile.headline}</div>
      )}
      {app.profile?.skills && app.profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {app.profile.skills.slice(0, 3).map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] py-0 rounded-full">{s}</Badge>
          ))}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground mt-2">{t('Applied')} {timeAgo(app.createdAt)}</div>
    </Card>
  )
}

function StatusColumn({
  status,
  label,
  apps,
  onCardClick,
}: {
  status: AppStatus
  label: string
  apps: Applicant[]
  onCardClick: (app: Applicant) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` })
  return (
    <div className="min-w-[240px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Badge variant="muted" className="rounded-full">{apps.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-2 min-h-[120px] p-2 rounded-2xl border bg-slate-50/60 transition-colors',
          isOver && 'border-primary/60 bg-primary/5',
        )}
      >
        {apps.map((app) => (
          <ApplicantCard key={app._id} app={app} onClick={() => onCardClick(app)} />
        ))}
        {apps.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-3 italic">{t('Drop here')}</div>
        )}
      </div>
    </div>
  )
}

export default function RecruiterApplicants() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [active, setActive] = useState<Applicant | null>(null)
  const [noteText, setNoteText] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { data, isLoading } = useQuery({
    queryKey: ['job-applicants', id, sort],
    queryFn: async () => {
      const url = sort === 'match' ? `/match/applicants-for-job/${id}` : `/applications/by-job/${id}`
      const res = await api.get<{
        items: Applicant[]
        job: { _id: string; title: string; company: string; screeningQuestions?: string[] }
      }>(url)
      let items = res.data.items
      if (sort === 'screening') {
        items = [...items].sort((a, b) => (b.screeningScore ?? -1) - (a.screeningScore ?? -1))
      }
      return { ...res.data, items }
    },
    enabled: !!id,
  })

  const grouped = useMemo(() => {
    const g: Record<AppStatus, Applicant[]> = {
      applied: [], screening: [], interview: [], offer: [], hired: [], rejected: [],
    }
    data?.items.forEach((a) => g[a.status].push(a))
    return g
  }, [data])

  async function changeStatus(applicantId: string, status: AppStatus) {
    try {
      await api.patch(`/applications/${applicantId}/status`, { status })
      qc.invalidateQueries({ queryKey: ['job-applicants', id] })
      qc.invalidateQueries({ queryKey: ['recruiter-stats'] })
      if (active?._id === applicantId) setActive((prev) => (prev ? { ...prev, status } : prev))
    } catch (err) {
      toast({ title: t('Could not update status'), description: apiError(err), variant: 'error' })
    }
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return
    const overId = String(e.over.id)
    if (!overId.startsWith('col-')) return
    const targetStatus = overId.slice(4) as AppStatus
    const draggedId = String(e.active.id)
    const dragged = data?.items.find((x) => x._id === draggedId)
    if (!dragged || dragged.status === targetStatus) return
    changeStatus(draggedId, targetStatus)
  }

  async function addNote() {
    if (!active || !noteText.trim()) return
    try {
      const res = await api.post(`/applications/${active._id}/notes`, { text: noteText.trim() })
      setActive((prev) => (prev ? { ...prev, notes: res.data.application.notes } : prev))
      setNoteText('')
      qc.invalidateQueries({ queryKey: ['job-applicants', id] })
    } catch (err) {
      toast({ title: t('Could not add note'), description: apiError(err), variant: 'error' })
    }
  }

  const screeningQuestions = data?.job?.screeningQuestions ?? []

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-3 -ml-3 rounded-full">
        <Link to="/recruiter/jobs">
          <ArrowLeft className="h-4 w-4" /> {t('Back to jobs')}
        </Link>
      </Button>

      <PageHeader
        title={data?.job?.title ?? t('Applicants')}
        description={data?.job?.company}
        actions={
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <TabsList>
              <TabsTrigger value="recent">{t('Most recent')}</TabsTrigger>
              <TabsTrigger value="match">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> {t('AI match')}
              </TabsTrigger>
              {screeningQuestions.length > 0 && (
                <TabsTrigger value="screening">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> {t('Screening')}
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        }
      />

      {isLoading ? (
        <Card className="rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground">{t('Loading applicants…')}</CardContent></Card>
      ) : !data || data.items.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="py-16 text-center text-muted-foreground">{t('No applicants yet.')}</CardContent></Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {STATUS_ORDER.map((status) => (
              <StatusColumn
                key={status}
                status={status}
                label={t(STATUS_LABELS[status].label)}
                apps={grouped[status]}
                onCardClick={setActive}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Applicant detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle>{active.seeker?.name}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <MatchScoreBadge score={active.matchScore} size="md" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{active.seeker?.email}</div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label={t('Headline')} value={active.profile?.headline || '—'} />
                <Info label={t('City')} value={active.profile?.city || '—'} />
                <Info label={t('Experience')} value={`${active.profile?.experienceYears ?? 0} ${t('years')}`} />
                <Info
                  label={t('Expected salary')}
                  value={active.profile?.expectedSalaryINR ? formatINR(active.profile.expectedSalaryINR) : '—'}
                />
              </div>

              {active.profile?.skills && active.profile.skills.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{t('Skills')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.profile.skills.map((s) => <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>)}
                  </div>
                </div>
              )}

              {active.resumeUrlSnapshot && (
                <a
                  href={active.resumeUrlSnapshot}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" /> {t('Open resume')}
                </a>
              )}

              {active.coverLetter && (
                <div className="rounded-xl border p-3 bg-slate-50">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{t('Cover letter')}</div>
                  <div className="text-sm whitespace-pre-wrap">{active.coverLetter}</div>
                </div>
              )}

              <ScreeningScorePanel
                status={active.screeningStatus}
                score={active.screeningScore}
                questions={screeningQuestions}
                answers={active.screeningAnswers ?? []}
                rubric={active.screeningRubric ?? []}
              />

              <ApplicationTimeline
                createdAt={active.createdAt}
                statusHistory={active.statusHistory ?? []}
                notes={active.notes ?? []}
                screeningStatus={active.screeningStatus}
              />

              <div className="border-t pt-3">
                <Label className="mb-2 block">{t('Pipeline status')}</Label>
                <Select value={active.status} onValueChange={(v) => changeStatus(active._id, v as AppStatus)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{t(STATUS_LABELS[s].label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-3 space-y-3">
                <Label>{t('Recruiter notes')}</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t('Add a note (only your team can see this)')}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                  />
                  <Button onClick={addNote} disabled={!noteText.trim()}>
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActive(null)}>{t('Close')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  )
}
