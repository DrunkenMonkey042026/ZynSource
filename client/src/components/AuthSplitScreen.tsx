import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ShieldCheck, IndianRupee, Quote } from 'lucide-react'
import { t } from '@/lib/i18n'

const TESTIMONIALS = [
  {
    quote:
      'ZynSource helped me land a senior role at Razorpay in 2 weeks. The AI matches were spot on.',
    author: 'Arjun M.',
    role: 'Senior Engineer · Bengaluru',
  },
  {
    quote: 'I hired three engineers in a month using the ATS. The pipeline view is genuinely a delight.',
    author: 'Priya S.',
    role: 'Talent Lead · Cred',
  },
  {
    quote: 'Best Indian job platform I\'ve used. Profile parsing saved me hours.',
    author: 'Rahul K.',
    role: 'Designer · Mumbai',
  },
]

export function AuthSplitScreen({ children }: { children: ReactNode }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(id)
  }, [])
  const current = TESTIMONIALS[i]

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-semibold mb-8">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient text-white text-sm font-bold">
              Z
            </span>
            <span>ZynSource</span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right: gradient panel with rotating testimonials */}
      <div className="hidden lg:block relative overflow-hidden bg-brand-gradient">
        <div aria-hidden className="absolute inset-0 bg-mesh opacity-15" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" /> {t('Hiring, reimagined for India')}
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight mt-6 leading-tight">
              {t('A faster way to find work — and a better way to hire.')}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3 my-12 max-w-md">
            <Stat icon={<Sparkles className="h-4 w-4" />} label={t('AI matched')} value="94%" />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} label={t('Verified')} value="500+" />
            <Stat icon={<IndianRupee className="h-4 w-4" />} label={t('Salaries')} value={t('Open')} />
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 max-w-md">
            <Quote className="h-5 w-5 text-white/80" />
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-base mt-3 leading-relaxed">"{current.quote}"</p>
                <div className="text-sm text-white/80 mt-4">
                  <span className="font-medium text-white">{current.author}</span> · {current.role}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/15">
      <div className="text-white/80">{icon}</div>
      <div className="font-display font-semibold text-2xl tabular-nums mt-2">{value}</div>
      <div className="text-xs text-white/70 mt-0.5">{label}</div>
    </div>
  )
}
