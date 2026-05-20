import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface RubricEntry {
  questionIndex: number
  score: number // 0..10
  rationale: string
}

interface Props {
  status?: 'none' | 'pending' | 'done' | 'failed'
  score?: number
  questions: string[]
  answers: string[]
  rubric: RubricEntry[]
}

function scoreColor(s: number) {
  if (s >= 8) return 'text-emerald-700 bg-emerald-100 ring-emerald-200'
  if (s >= 6) return 'text-indigo-700 bg-indigo-100 ring-indigo-200'
  if (s >= 4) return 'text-amber-700 bg-amber-100 ring-amber-200'
  return 'text-slate-700 bg-slate-100 ring-slate-200'
}

export function ScreeningScorePanel({ status, score, questions, answers, rubric }: Props) {
  if (!status || status === 'none') return null

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> {t('AI screening')}
        </div>
        {status === 'done' && score != null && (
          <span className="inline-flex items-center gap-1 rounded-full ring-1 px-3 py-1 text-xs font-semibold bg-primary/10 text-primary ring-primary/20">
            {t('Overall')}: {score}%
          </span>
        )}
        {status === 'pending' && <span className="text-xs text-muted-foreground">{t('Scoring…')}</span>}
        {status === 'failed' && <span className="text-xs text-destructive">{t('Scoring failed')}</span>}
      </div>

      {questions.map((q, i) => {
        const r = rubric.find((x) => x.questionIndex === i)
        return (
          <div key={i} className="rounded-xl border p-3 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Q{i + 1}</div>
            <div className="font-medium">{q}</div>
            <div className="mt-2 whitespace-pre-wrap text-foreground/90">{answers[i] || <span className="italic text-muted-foreground">{t('(no answer)')}</span>}</div>
            {r && (
              <div className="mt-3 flex items-start gap-2">
                <span className={cn('inline-flex items-center rounded-full ring-1 px-2 py-0.5 text-[11px] font-semibold shrink-0', scoreColor(r.score))}>
                  {r.score}/10
                </span>
                <div className="text-xs text-muted-foreground">{r.rationale}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
