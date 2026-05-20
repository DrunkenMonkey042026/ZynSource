import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Send, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface SavedSearch {
  _id: string
  name: string
  frequency: 'daily' | 'weekly' | 'instant'
  filters: Record<string, string>
  lastSentAt?: string
  createdAt: string
}

export default function SeekerAlerts() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['my-saved-searches'],
    queryFn: async () => (await api.get<{ items: SavedSearch[] }>('/saved-searches')).data.items,
  })

  async function sendNow(id: string) {
    try {
      const res = await api.post(`/saved-searches/${id}/send-now`)
      toast({
        title: res.data.sent ? t('Digest sent') : t('Triggered (email not configured)'),
        description: t('{{count}} matching jobs', { count: res.data.count }),
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['my-saved-searches'] })
    } catch (err) {
      toast({ title: t('Send failed'), description: apiError(err), variant: 'error' })
    }
  }

  async function remove(id: string) {
    if (!confirm(t('Delete this alert?'))) return
    try {
      await api.delete(`/saved-searches/${id}`)
      qc.invalidateQueries({ queryKey: ['my-saved-searches'] })
      toast({ title: t('Alert deleted'), variant: 'success' })
    } catch (err) {
      toast({ title: t('Delete failed'), description: apiError(err), variant: 'error' })
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title={t('My alerts')} description={t('Saved searches we email you about.')} />

      {isLoading ? (
        <div className="text-muted-foreground">{t('Loading…')}</div>
      ) : !data || data.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
            {t("You haven't saved any searches yet. Use the Save search button on the Jobs page.")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s) => {
            const activeFilters = Object.entries(s.filters)
              .filter(([, v]) => v && v !== 'any')
              .map(([k, v]) => `${k}:${v}`)
            return (
              <Card key={s._id} className="rounded-2xl">
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold">{s.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeFilters.length === 0 ? (
                        <Badge variant="outline" className="rounded-full">{t('All jobs')}</Badge>
                      ) : (
                        activeFilters.map((f) => <Badge key={f} variant="outline" className="rounded-full text-xs">{f}</Badge>)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {t('Email')} · {s.frequency} · {s.lastSentAt ? `${t('last sent')} ${timeAgo(s.lastSentAt)}` : t('not sent yet')}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => sendNow(s._id)}>
                      <Send className="h-3.5 w-3.5" /> {t('Send now')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(s._id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
