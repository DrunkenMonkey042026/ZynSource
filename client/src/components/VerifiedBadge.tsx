import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Props {
  size?: 'sm' | 'md'
  className?: string
}

export function VerifiedBadge({ size = 'sm', className }: Props) {
  return (
    <span
      title={t('Verified employer')}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        className,
      )}
    >
      <BadgeCheck className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {t('Verified')}
    </span>
  )
}
