import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Building2, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'

interface Company {
  _id: string
  name: string
  slug: string
  logoUrl: string
  reviewCount: number
  reviewAverage: number
}

export default function Companies() {
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['companies', q],
    queryFn: async () => (await api.get<{ items: Company[]; total: number }>('/companies', { params: { q } })).data,
  })

  return (
    <div className="container max-w-5xl py-8">
      <SeoHead title="Companies hiring on ZynSource" description="Discover companies hiring across India — reviews, salaries, and open roles." />
      <PageHeader title={t('Companies')} description={t('Browse companies hiring on ZynSource.')} />

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10 h-11 rounded-full" placeholder={t('Search companies')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">{t('Loading…')}</div>
      ) : !data || data.items.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground">{t('No companies match your search.')}</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((c) => (
            <Link key={c._id} to={`/companies/${c.slug}`} className="block group">
              <Card className="rounded-2xl hover:border-primary/40 hover:shadow-glow transition-all">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-brand-gradient-soft border flex items-center justify-center font-display font-semibold">
                      {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="h-10 w-10 rounded-lg" /> : c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold group-hover:text-primary truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {c.reviewAverage ? `${c.reviewAverage.toFixed(1)} (${c.reviewCount})` : t('No reviews yet')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
