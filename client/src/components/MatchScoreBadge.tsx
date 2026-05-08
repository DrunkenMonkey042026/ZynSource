import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  score?: number // 0..100; undefined => render nothing
  size?: 'sm' | 'md'
  className?: string
}

export function MatchScoreBadge({ score, size = 'sm', className }: Props) {
  if (score == null || score < 50) return null

  const tone =
    score >= 85
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
      : score >= 70
      ? 'bg-indigo-100 text-indigo-800 ring-indigo-200'
      : 'bg-slate-100 text-slate-700 ring-slate-200'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full ring-1 font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        tone,
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {Math.round(score)}% match
    </span>
  )
}
