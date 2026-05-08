import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface Props {
  to: number
  durationMs?: number
  format?: (n: number) => string
  className?: string
}

export function AnimatedCounter({ to, durationMs = 1200, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { duration: durationMs, stiffness: 60, damping: 18 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (inView) mv.set(to)
  }, [inView, to, mv])

  useEffect(() => {
    return spring.on('change', (latest) => setDisplay(Math.round(latest)))
  }, [spring])

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : display.toLocaleString('en-IN')}
    </span>
  )
}
