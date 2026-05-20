import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Notification {
  _id: string
  type: string
  title: string
  body: string
  link: string
  readAt?: string
  createdAt: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<{ items: Notification[]; unread: number }>('/notifications')).data,
    enabled: !!user,
    refetchInterval: 30_000,
  })

  if (!user) return null

  async function markAllRead() {
    await api.post('/notifications/read-all')
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function markOneRead(id: string) {
    await api.post(`/notifications/${id}/read`)
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const unread = data?.unread ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-accent transition-colors"
        aria-label={t('Notifications')}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-brand-gradient text-white text-[10px] font-semibold px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border bg-popover text-popover-foreground shadow-lg z-50"
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="font-medium">{t('Notifications')}</div>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> {t('Mark all read')}
                  </button>
                )}
              </div>
              {(!data || data.items.length === 0) ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{t('No notifications yet.')}</div>
              ) : (
                <ul className="divide-y">
                  {data.items.map((n) => (
                    <li key={n._id} className={cn('p-3 hover:bg-accent/50 transition-colors', !n.readAt && 'bg-primary/5')}>
                      <Link to={n.link || '#'} onClick={() => { markOneRead(n._id); setOpen(false) }} className="block">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                        <div className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
