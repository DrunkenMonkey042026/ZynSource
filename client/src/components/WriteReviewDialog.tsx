import { useState } from 'react'
import { Star } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { t } from '@/lib/i18n'

interface Props {
  companySlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WriteReviewDialog({ companySlug, open, onOpenChange }: Props) {
  const [rating, setRating] = useState(5)
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  async function submit() {
    if (!user) {
      onOpenChange(false)
      navigate('/login')
      return
    }
    if (user.role !== 'seeker') {
      toast({ title: t('Only seekers can post reviews'), variant: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await api.post('/reviews', { companySlug, rating, headline, body, anonymous })
      toast({ title: t('Thanks for your review!'), variant: 'success' })
      qc.invalidateQueries({ queryKey: ['company', companySlug] })
      onOpenChange(false)
      setHeadline('')
      setBody('')
    } catch (err) {
      toast({ title: t('Could not post review'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Write a review')}</DialogTitle>
          <DialogDescription>{t('Share your experience working with or interviewing at this company.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">{t('Overall rating')}</Label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRating(i + 1)} className="p-1" aria-label={`${i + 1} star`}>
                  <Star className={`h-7 w-7 ${i < rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="headline">{t('Headline')}</Label>
            <Input
              id="headline"
              maxLength={120}
              placeholder={t('Great culture, fast-paced team')}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="body">{t('Your review')}</Label>
            <Textarea
              id="body"
              rows={6}
              maxLength={4000}
              placeholder={t('What was your experience? What stood out?')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            {t('Post anonymously')}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={submit} disabled={submitting || headline.trim().length < 2 || body.trim().length < 10}>
            {submitting ? t('Posting…') : t('Post review')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
