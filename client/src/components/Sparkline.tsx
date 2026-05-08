import { cn } from '@/lib/utils'

interface Props {
  data: number[]
  className?: string
  stroke?: string
  fill?: string
  height?: number
}

export function Sparkline({ data, className, stroke = 'hsl(var(--primary))', fill = 'hsl(var(--primary) / 0.12)', height = 36 }: Props) {
  if (data.length === 0) return null

  const w = 120
  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  const path = `M ${points.join(' L ')}`
  const area = `${path} L ${w},${h} L 0,${h} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('w-full', className)}
      preserveAspectRatio="none"
      role="img"
      aria-label="trend"
    >
      <path d={area} fill={fill} />
      <path d={path} stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
