import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Bento({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[180px] gap-4', className)}>
      {children}
    </div>
  )
}
