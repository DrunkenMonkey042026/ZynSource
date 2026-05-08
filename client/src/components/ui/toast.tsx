import * as React from 'react'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'error'
interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((input: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Date.now() + Math.random()
    const item: ToastItem = { id, title: input.title, description: input.description, variant: input.variant ?? 'default' }
    setToasts((prev) => [...prev, item])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-96">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-md border bg-background p-4 shadow-lg animate-in slide-in-from-bottom-4',
              t.variant === 'success' && 'border-emerald-200 bg-emerald-50',
              t.variant === 'error' && 'border-red-200 bg-red-50',
            )}
          >
            <div className="font-medium text-sm">{t.title}</div>
            {t.description && <div className="text-sm text-muted-foreground mt-1">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
