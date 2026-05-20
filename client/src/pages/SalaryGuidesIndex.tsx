import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

function humanize(s: string) {
  return s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function SalaryGuidesIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ['salary-guides-index'],
    queryFn: async () =>
      (await api.get<{ items: { role: string; city: string; count: number }[] }>('/salary-guides')).data,
  })

  return (
    <div className="container max-w-5xl py-8">
      <SeoHead title="Salary guides" description="Aggregated salary data for roles across Indian cities — median, percentiles, top companies." />
      <PageHeader title={t('Salary guides')} description={t('Median pay for roles across Indian cities, aggregated live.')} />

      {isLoading ? (
        <div className="text-muted-foreground">{t('Loading…')}</div>
      ) : !data || data.items.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground">{t('Not enough salary data yet — post more jobs with salary ranges.')}</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((g) => (
            <Link key={`${g.role}-${g.city}`} to={`/salary-guides/${g.role}/${g.city}`} className="block group">
              <Card className="rounded-2xl hover:border-primary/40 hover:shadow-glow transition-all">
                <CardContent className="p-5">
                  <div className="font-display font-semibold group-hover:text-primary">{humanize(g.role)}</div>
                  <div className="text-sm text-muted-foreground mt-1">{humanize(g.city)}</div>
                  <div className="text-xs text-muted-foreground font-mono tabular-nums mt-2">{g.count} {t('roles')}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
