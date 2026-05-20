import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

interface PostListItem {
  _id: string
  title: string
  slug: string
  excerpt: string
  coverImageUrl: string
  authorName: string
  tags: string[]
  publishedAt?: string
  createdAt: string
}

export default function Blog() {
  const { data, isLoading } = useQuery({
    queryKey: ['blog'],
    queryFn: async () => (await api.get<{ items: PostListItem[] }>('/posts')).data,
  })

  return (
    <div className="container max-w-5xl py-8">
      <SeoHead title="The ZynSource Blog" description="Hiring trends, career advice, and salary reports from across Indian tech." />
      <PageHeader title={t('The ZynSource Blog')} description={t('Hiring trends, career advice, and salary reports.')} />

      {isLoading ? (
        <div className="text-muted-foreground">{t('Loading…')}</div>
      ) : !data || data.items.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground">{t('No posts yet.')}</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data.items.map((p) => (
            <Link key={p._id} to={`/blog/${p.slug}`} className="block group">
              <Card className="rounded-2xl hover:border-primary/40 hover:shadow-glow transition-all overflow-hidden">
                {p.coverImageUrl && <img src={p.coverImageUrl} alt={p.title} className="w-full h-44 object-cover" />}
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="rounded-full text-xs">{tag}</Badge>)}
                  </div>
                  <h2 className="font-display text-xl font-semibold group-hover:text-primary">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>}
                  <div className="text-xs text-muted-foreground mt-3">
                    {p.authorName} · {timeAgo(p.publishedAt ?? p.createdAt)}
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
