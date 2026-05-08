import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Span = '1x1' | '1x2' | '2x1' | '2x2'
type Pattern = 'none' | 'grid' | 'dots' | 'glow'

const spanClass: Record<Span, string> = {
  '1x1': 'sm:col-span-1 sm:row-span-1',
  '1x2': 'sm:col-span-1 sm:row-span-2',
  '2x1': 'sm:col-span-2 sm:row-span-1',
  '2x2': 'sm:col-span-2 sm:row-span-2',
}

interface Props {
  span?: Span
  gradient?: boolean
  pattern?: Pattern
  className?: string
  onClick?: () => void
  children: ReactNode
}

export function BentoCard({ span = '1x1', gradient = false, pattern = 'none', className, onClick, children }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card text-card-foreground p-6 transition-shadow hover:shadow-glow',
        gradient && 'bg-brand-gradient-soft',
        onClick && 'cursor-pointer',
        spanClass[span],
        className,
      )}
    >
      {pattern === 'grid' && (
        <div className="pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)] bg-mesh" />
      )}
      {pattern === 'dots' && (
        <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)] bg-dots" />
      )}
      {pattern === 'glow' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 rounded-full bg-brand-gradient-soft blur-3xl opacity-60"
        />
      )}
      <div className="relative h-full">{children}</div>
    </motion.div>
  )
}
