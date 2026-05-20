import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, apiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'How do I post a job?',
  'How does AI matching work?',
  'How do I save a job search?',
]

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [msgs, open])

  async function send(text: string) {
    if (!text.trim() || sending) return
    setError(null)
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    setSending(true)
    try {
      const res = await api.post<{ reply: string }>('/chat', { message: text, history: msgs })
      setMsgs((m) => [...m, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      setError(apiError(err, t('Could not reach the assistant')))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-brand-gradient text-white shadow-glow flex items-center justify-center"
        aria-label={t('Open chat')}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[480px] max-h-[70vh] flex flex-col rounded-2xl border bg-background shadow-xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-brand-gradient text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div className="font-display font-semibold">{t('ZynSource help')}</div>
            </div>

            <div ref={scrollerRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {msgs.length === 0 && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-3">{t("Hi! Ask me anything about using ZynSource.")}</p>
                  <div className="flex flex-col gap-1.5">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3 py-2 rounded-full border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        {t(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2 text-sm bg-secondary text-secondary-foreground">…</div>
                </div>
              )}
              {error && <div className="text-xs text-destructive p-2">{error}</div>}
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder={t('Ask a question…')}
                className="flex-1 h-9 px-3 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="icon" className="rounded-full h-9 w-9" onClick={() => send(input)} disabled={!input.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
