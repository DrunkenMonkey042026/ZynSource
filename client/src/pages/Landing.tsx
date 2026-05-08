import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JobCard, type JobSummary } from '@/components/JobCard'
import { GradientHero } from '@/components/GradientHero'
import { Bento } from '@/components/Bento'
import { BentoCard } from '@/components/BentoCard'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { MagneticButton } from '@/components/MagneticButton'
import { MarqueeLogos } from '@/components/MarqueeLogos'
import { RecommendedRail } from '@/components/RecommendedRail'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

const TRUSTED_LOGOS = [
  'Razorpay',
  'Swiggy',
  'Zerodha',
  'Flipkart',
  'PhonePe',
  'Postman',
  'CRED',
  'Meesho',
  'Freshworks',
  'Zoho',
]

const TRENDING_SKILLS = ['React', 'TypeScript', 'Python', 'AWS', 'Node.js', 'Kubernetes', 'AI / ML', 'Go']

const TOP_CITIES = [
  { name: 'Bengaluru', count: 1240 },
  { name: 'Hyderabad', count: 740 },
  { name: 'Mumbai', count: 620 },
  { name: 'Pune', count: 510 },
  { name: 'Delhi', count: 480 },
  { name: 'Remote', count: 980 },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')

  const featured = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: async () => (await api.get<{ items: JobSummary[]; total: number }>('/jobs', { params: { limit: 6 } })).data,
  })

  function search(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (city.trim()) params.set('city', city.trim())
    navigate(`/jobs?${params.toString()}`)
  }

  return (
    <>
      <GradientHero
        eyebrow={
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('Live')} · {featured.data ? <AnimatedCounter to={featured.data.total} /> : '12k+'} {t('open roles')}
          </>
        }
        title={
          <>
            {t('Find work that')} <span className="text-gradient-brand">{t('fits.')}</span>
            <br />
            {t('The hiring platform built for India.')}
          </>
        }
        subtitle={t(
          'Search 12,000+ live jobs across Bengaluru, Mumbai, Pune and remote. AI-matched to your profile in seconds.',
        )}
      >
        <form onSubmit={search} className="flex flex-col md:flex-row gap-3 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Job title, skill, or company')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-11 h-14 rounded-full bg-background/80 backdrop-blur"
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('City — Bengaluru, Mumbai, Remote…')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-11 h-14 rounded-full bg-background/80 backdrop-blur"
            />
          </div>
          <MagneticButton type="submit" className="h-14 md:w-auto">
            {t('Find jobs')} <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </form>
      </GradientHero>

      {/* Trust marquee */}
      <section className="container -mt-2 pb-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-4">
          {t('Trusted by India\'s most innovative teams')}
        </p>
        <MarqueeLogos items={TRUSTED_LOGOS} />
      </section>

      {/* Bento grid */}
      <section className="container py-6">
        <Bento>
          {/* Live job count */}
          <BentoCard span="2x2" gradient pattern="glow">
            <div className="flex flex-col h-full justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> {t('This week')}
              </div>
              <div>
                <div className="font-display font-semibold text-5xl md:text-6xl tabular-nums leading-none">
                  +
                  <AnimatedCounter to={3142} />
                </div>
                <div className="text-base mt-2 text-muted-foreground">
                  {t('new jobs added in the last 7 days')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full" size="sm">
                  <Link to="/jobs?sort=recent">{t('Browse newest')}</Link>
                </Button>
              </div>
            </div>
          </BentoCard>

          {/* Trending skills */}
          <BentoCard span="2x1" pattern="dots">
            <div className="flex flex-col h-full">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" /> {t('Hot skills right now')}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {TRENDING_SKILLS.map((s) => (
                  <Link key={s} to={`/jobs?skills=${encodeURIComponent(s)}`}>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                      {s}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </BentoCard>

          {/* AI matching CTA */}
          <BentoCard
            span="1x1"
            gradient
            onClick={() => navigate(user?.role === 'seeker' ? '/me/profile' : '/register')}
          >
            <div className="flex flex-col h-full justify-between">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <div className="font-display font-semibold text-lg">{t('AI match')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('Upload your resume — we surface jobs picked just for you.')}
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Verified employer */}
          <BentoCard span="1x1">
            <div className="flex flex-col h-full justify-between">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="font-display font-semibold text-lg">{t('Verified employers')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('Every recruiter on ZynSource is human-checked.')}
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Top cities (full row) */}
          <BentoCard span="2x1" pattern="grid">
            <div className="flex flex-col h-full">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {t('Hiring across India')}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 flex-1">
                {TOP_CITIES.map((c) => (
                  <Link
                    key={c.name}
                    to={`/jobs?city=${encodeURIComponent(c.name)}`}
                    className="group rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground font-mono tabular-nums mt-1">
                      {c.count.toLocaleString('en-IN')} {t('jobs')}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </BentoCard>
        </Bento>
      </section>

      {/* Recommended for you (seekers only) */}
      {user?.role === 'seeker' && <RecommendedRail />}

      {/* Featured jobs */}
      <section className="container py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {t('Featured roles')}
            </h2>
            <p className="text-muted-foreground mt-1">{t('Hand-picked openings from top employers.')}</p>
          </div>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/jobs">
              {t('View all')} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featured.isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl p-6">
                <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded mt-3" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded mt-3" />
              </Card>
            ))}
          </div>
        ) : featured.data && featured.data.items.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            className="grid md:grid-cols-2 gap-4"
          >
            {featured.data.items.map((job) => (
              <motion.div
                key={job._id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('No jobs yet. Run')} <code className="text-xs bg-muted px-1.5 py-0.5 rounded">npm run seed</code>{' '}
              {t('to add sample data.')}
            </CardContent>
          </Card>
        )}
      </section>

      {/* CTA blocks */}
      <section className="container py-16 grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-8 text-white">
          <div aria-hidden className="absolute inset-0 bg-mesh opacity-20" />
          <div className="relative">
            <Briefcase className="h-8 w-8 mb-4" />
            <h3 className="font-display text-3xl font-semibold tracking-tight">{t('For job seekers')}</h3>
            <p className="text-white/85 mt-2 max-w-md">
              {t('Build a profile, upload your resume, get AI-ranked matches to roles across India.')}
            </p>
            <Button asChild variant="secondary" className="mt-6 rounded-full">
              <Link to="/register">
                {t('Create your profile')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-8 text-white">
          <div aria-hidden className="absolute inset-0 bg-dots opacity-20" />
          <div className="relative">
            <Users className="h-8 w-8 mb-4" />
            <h3 className="font-display text-3xl font-semibold tracking-tight">{t('For recruiters')}</h3>
            <p className="text-slate-300 mt-2 max-w-md">
              {t('Post jobs, screen candidates, and run your hiring pipeline — all from one beautiful dashboard.')}
            </p>
            <Button asChild variant="secondary" className="mt-6 rounded-full">
              <Link to="/register">
                {t('Start hiring')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
