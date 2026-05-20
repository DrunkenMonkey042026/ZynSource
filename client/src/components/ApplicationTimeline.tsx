import { Sparkles, ArrowRight, FileText, Send } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { STATUS_LABELS, type AppStatus } from '@/components/StatusBadge'
import { t } from '@/lib/i18n'

interface StatusEntry {
  from?: string
  to?: string
  at?: string
}

interface Note {
  text: string
  createdAt: string
}

interface Props {
  createdAt: string
  statusHistory: StatusEntry[]
  notes: Note[]
  screeningStatus?: 'none' | 'pending' | 'done' | 'failed'
}

interface Event {
  kind: 'created' | 'status' | 'note' | 'screening'
  at: string
  text: string
  detail?: string
}

function statusLabel(s?: string) {
  if (!s) return ''
  return STATUS_LABELS[s as AppStatus]?.label ?? s
}

export function ApplicationTimeline({ createdAt, statusHistory, notes, screeningStatus }: Props) {
  const events: Event[] = []
  events.push({ kind: 'created', at: createdAt, text: t('Applied') })
  if (screeningStatus === 'done') {
    events.push({ kind: 'screening', at: createdAt, text: t('AI screening completed') })
  }
  for (const h of statusHistory.slice(1)) {
    // The first entry was the apply itself; subsequent are transitions
    events.push({
      kind: 'status',
      at: h.at ?? createdAt,
      text: `${statusLabel(h.from)} → ${statusLabel(h.to)}`,
    })
  }
  for (const n of notes) {
    events.push({ kind: 'note', at: n.createdAt, text: t('Note added'), detail: n.text })
  }
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="text-sm font-medium">{t('Timeline')}</div>
      <ol className="relative border-l ml-2 pl-5 space-y-3">
        {events.map((e, i) => {
          const Icon = e.kind === 'screening' ? Sparkles : e.kind === 'note' ? FileText : e.kind === 'created' ? Send : ArrowRight
          return (
            <li key={i} className="relative">
              <span
                className={cn(
                  'absolute -left-[34px] top-0.5 h-6 w-6 rounded-full ring-2 ring-background flex items-center justify-center',
                  e.kind === 'screening' && 'bg-primary text-primary-foreground',
                  e.kind === 'note' && 'bg-slate-200 text-slate-700',
                  e.kind === 'created' && 'bg-emerald-100 text-emerald-700',
                  e.kind === 'status' && 'bg-indigo-100 text-indigo-700',
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <div className="text-sm font-medium">{e.text}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(e.at)}</div>
              {e.detail && <div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap bg-slate-50 rounded-lg p-2">{e.detail}</div>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
