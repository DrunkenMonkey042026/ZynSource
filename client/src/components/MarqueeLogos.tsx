import { cn } from '@/lib/utils'

interface Props {
  items: string[]
  className?: string
}

export function MarqueeLogos({ items, className }: Props) {
  // Duplicate the list so the loop is seamless
  const doubled = [...items, ...items]
  return (
    <div
      className={cn(
        'relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]',
        className,
      )}
    >
      <div className="flex gap-12 w-max animate-marquee whitespace-nowrap py-2">
        {doubled.map((label, i) => (
          <span
            key={i}
            className="text-xl md:text-2xl font-display font-medium text-muted-foreground/80"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
