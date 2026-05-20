import { Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/lib/i18n'

interface Props {
  questions: string[]
  answers: string[]
  onChange: (next: string[]) => void
}

export function ScreeningQuestionsForm({ questions, answers, onChange }: Props) {
  if (questions.length === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> {t('AI screening questions')}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('Every applicant answers the same questions, scored fairly by AI.')}
      </p>
      {questions.map((q, i) => (
        <div key={i} className="space-y-1.5">
          <Label className="text-sm">
            {i + 1}. {q}
          </Label>
          <Textarea
            rows={3}
            placeholder={t('Be specific. Use a concrete example.')}
            value={answers[i] ?? ''}
            onChange={(e) => {
              const next = [...answers]
              next[i] = e.target.value
              onChange(next)
            }}
            maxLength={2000}
          />
        </div>
      ))}
    </div>
  )
}
