import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  className?: string
}

export function GradientHero({ eyebrow, title, subtitle, children, className }: Props) {
  return (
    <section className={cn('relative overflow-hidden', className)}>
      {/* Soft animated radial gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-hero-gradient animate-gradient-drift" />
      {/* Faint grid mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)] bg-mesh" />

      {/* Floating shapes */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-10 h-48 w-48 rounded-full bg-brand-gradient-soft blur-3xl"
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-brand-gradient-soft blur-3xl"
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative pt-20 pb-16 md:pt-28 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          {eyebrow && (
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl">{subtitle}</p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  )
}
