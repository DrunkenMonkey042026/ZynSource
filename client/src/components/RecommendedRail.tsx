import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobCard, type JobSummary } from '@/components/JobCard'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

interface MatchedJob extends JobSummary {
  matchScore?: number
}

export function RecommendedRail() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommended-jobs'],
    queryFn: async () => {
      const res = await api.get<{ items: MatchedJob[] }>('/match/jobs-for-me')
      return res.data.items
    },
    retry: false,
  })

  if (isError) return null
  if (!isLoading && (!data || data.length === 0)) return null

  return (
    <section className="container py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> {t('AI matched for you')}
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight mt-1">
            {t('Recommended roles')}
          </h2>
        </div>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/jobs?recommended=1">
            {t('More matches')} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl p-6">
              <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded mt-3" />
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
          className="grid md:grid-cols-2 gap-4"
        >
          {(data ?? []).slice(0, 6).map((j) => (
            <motion.div key={j._id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <JobCard job={j} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
