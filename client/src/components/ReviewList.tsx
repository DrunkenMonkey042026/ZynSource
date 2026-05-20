import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Review {
  _id: string
  rating: number
  headline: string
  body: string
  anonymous: boolean
  createdAt: string
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-center text-muted-foreground">
          {t('No reviews yet. Be the first to share your experience.')}
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <Card key={r._id} className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={i < r.rating ? 'h-4 w-4 fill-current' : 'h-4 w-4 text-slate-300'} />
              ))}
              <span className="text-xs text-muted-foreground ml-2">{timeAgo(r.createdAt)}</span>
            </div>
            <div className="font-display font-semibold text-lg mt-2">{r.headline}</div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{r.body}</p>
            <div className="text-xs text-muted-foreground mt-3">{r.anonymous ? t('Anonymous') : t('Verified reviewer')}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
