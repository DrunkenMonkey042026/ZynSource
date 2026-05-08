import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'

export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

const map: Record<AppStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'muted' }> = {
  applied: { label: 'Applied', variant: 'muted' },
  screening: { label: 'Screening', variant: 'info' },
  interview: { label: 'Interview', variant: 'warning' },
  offer: { label: 'Offer', variant: 'default' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = map[status]
  return <Badge variant={cfg.variant}>{t(cfg.label)}</Badge>
}

export const STATUS_ORDER: AppStatus[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
export const STATUS_LABELS = map
