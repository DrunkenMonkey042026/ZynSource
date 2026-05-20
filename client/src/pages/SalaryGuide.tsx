import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, IndianRupee, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { Bento } from '@/components/Bento'
import { BentoCard } from '@/components/BentoCard'
import { Sparkline } from '@/components/Sparkline'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface Data {
  role: string
  city: string
  count: number
  median: number
  p25: number
  p75: number
  min: number
  max: number
  distribution: number[]
  topCompanies: { name: string; count: number }[]
}

function humanize(s: string) {
  return s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function SalaryGuide() {
  const { role, city } = useParams<{ role: string; city: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['salary-guide', role, city],
    queryFn: async () => (await api.get<Data>(`/salary-guides/${role}/${city}`)).data,
    enabled: !!role && !!city,
  })

  if (isLoading) return <div className="container py-12 text-muted-foreground">{t('Loading…')}</div>
  if (isError || !data)
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">{t('No salary data for this combination yet.')}</p>
        <Button asChild className="mt-4 rounded-full"><Link to="/salary-guides">{t('Back to guides')}</Link></Button>
      </div>
    )

  const roleLabel = humanize(data.role)
  const cityLabel = humanize(data.city)

  return (
    <div className="container max-w-5xl py-8">
      <SeoHead
        title={`${roleLabel} salary in ${cityLabel}`}
        description={`Salary data for ${roleLabel} roles in ${cityLabel}: median ${formatINR(data.median)}, ranging from ${formatINR(data.min)} to ${formatINR(data.max)}.`}
        type="article"
      />
      <Button variant="ghost" asChild className="mb-3 -ml-3 rounded-full">
        <Link to="/salary-guides">
          <ArrowLeft className="h-4 w-4" /> {t('All salary guides')}
        </Link>
      </Button>

      <PageHeader
        title={`${roleLabel} · ${cityLabel}`}
        description={t('Salary aggregated from {{count}} open roles', { count: data.count })}
      />

      <Bento>
        <BentoCard span="2x2" gradient pattern="glow">
          <div className="flex flex-col h-full justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4" /> {t('Median')}
            </div>
            <div>
              <div className="font-display font-semibold text-5xl md:text-6xl tabular-nums leading-none">
                {formatINR(data.median)}
              </div>
              <div className="text-sm mt-2 text-muted-foreground">
                {t('per year, all-in')}
              </div>
            </div>
            <Sparkline data={data.distribution} />
          </div>
        </BentoCard>

        <BentoCard span="1x1">
          <div className="flex flex-col h-full justify-between">
            <div className="text-sm text-muted-foreground">{t('25th percentile')}</div>
            <div className="font-display tabular-nums text-3xl font-semibold">{formatINR(data.p25)}</div>
          </div>
        </BentoCard>
        <BentoCard span="1x1">
          <div className="flex flex-col h-full justify-between">
            <div className="text-sm text-muted-foreground">{t('75th percentile')}</div>
            <div className="font-display tabular-nums text-3xl font-semibold">{formatINR(data.p75)}</div>
          </div>
        </BentoCard>

        <BentoCard span="2x1">
          <div className="flex flex-col h-full justify-between">
            <div className="text-sm text-muted-foreground">{t('Range')}</div>
            <div className="font-display tabular-nums text-2xl font-semibold">
              {formatINR(data.min)} – {formatINR(data.max)}
            </div>
          </div>
        </BentoCard>

        <BentoCard span="2x1" pattern="dots">
          <div className="flex flex-col h-full">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> {t('Top hiring companies')}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.topCompanies.map((c) => (
                <span key={c.name} className="rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium">
                  {c.name} · {c.count}
                </span>
              ))}
            </div>
          </div>
        </BentoCard>
      </Bento>

      <Card className="rounded-2xl mt-6">
        <CardContent className="p-5 text-sm text-muted-foreground">
          {t('Salary data is aggregated from currently open job postings on ZynSource. Updated continuously.')}
        </CardContent>
      </Card>
    </div>
  )
}
