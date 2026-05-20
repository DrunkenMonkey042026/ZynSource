import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Building2, Globe, MapPin, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JobCard, type JobSummary } from '@/components/JobCard'
import { ReviewList } from '@/components/ReviewList'
import { WriteReviewDialog } from '@/components/WriteReviewDialog'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [reviewOpen, setReviewOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: async () => (await api.get(`/companies/${slug}`)).data,
    enabled: !!slug,
  })

  if (isLoading) return <div className="container py-12 text-muted-foreground">{t('Loading…')}</div>
  if (!data) return <div className="container py-12">{t('Company not found.')}</div>

  const { company, jobs, reviews } = data as {
    company: { name: string; slug: string; logoUrl: string; aboutMarkdown: string; reviewCount: number; reviewAverage: number; verified: boolean }
    jobs: JobSummary[]
    reviews: { _id: string; rating: number; headline: string; body: string; anonymous: boolean; createdAt: string }[]
  }

  return (
    <div className="container max-w-5xl py-8">
      <SeoHead
        title={`${company.name} — Jobs & reviews`}
        description={`Open roles, salary aggregates, and reviews for ${company.name} on ZynSource.`}
        type="article"
      />

      <Button variant="ghost" asChild className="mb-3 -ml-3 rounded-full">
        <Link to="/companies">
          <ArrowLeft className="h-4 w-4" /> {t('All companies')}
        </Link>
      </Button>

      {/* Hero */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 bg-brand-gradient-soft">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-white border flex items-center justify-center font-display font-bold text-3xl">
              {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-16 w-16 rounded-xl" /> : company.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">{company.name}</h1>
                {company.verified && <VerifiedBadge size="md" />}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> {jobs.length} {t('open roles')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {company.reviewAverage ? `${company.reviewAverage.toFixed(1)} (${company.reviewCount})` : t('No reviews yet')}
                </span>
              </div>
            </div>
            <Button onClick={() => setReviewOpen(true)} className="rounded-full">
              {t('Write a review')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      {company.aboutMarkdown && (
        <Card className="rounded-2xl mt-6">
          <CardContent className="p-6">
            <h2 className="font-display font-semibold text-xl mb-3">{t('About')}</h2>
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{company.aboutMarkdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open roles */}
      <section className="mt-8">
        <h2 className="font-display font-semibold text-2xl mb-4">{t('Open roles')}</h2>
        {jobs.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">{t('No open roles right now.')}</CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {jobs.map((j) => <JobCard key={j._id} job={j} />)}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="mt-8">
        <h2 className="font-display font-semibold text-2xl mb-4">{t('Reviews')}</h2>
        <ReviewList reviews={reviews} />
      </section>

      <WriteReviewDialog companySlug={slug!} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  )
}
