import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SeoHead } from '@/components/SeoHead'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { t } from '@/lib/i18n'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => (await api.get(`/posts/${slug}`)).data.post,
    enabled: !!slug,
  })

  if (isLoading) return <div className="container py-12 text-muted-foreground">{t('Loading…')}</div>
  if (!data) return <div className="container py-12">{t('Post not found.')}</div>

  return (
    <article className="container max-w-3xl py-8">
      <SeoHead title={data.title} description={data.excerpt} image={data.coverImageUrl || undefined} type="article" />
      <Button variant="ghost" asChild className="mb-3 -ml-3 rounded-full">
        <Link to="/blog">
          <ArrowLeft className="h-4 w-4" /> {t('All posts')}
        </Link>
      </Button>

      {data.coverImageUrl && <img src={data.coverImageUrl} alt={data.title} className="w-full rounded-2xl mb-6" />}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(data.tags ?? []).map((tag: string) => <Badge key={tag} variant="outline" className="rounded-full">{tag}</Badge>)}
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">{data.title}</h1>
      <div className="text-sm text-muted-foreground mt-3">
        {data.authorName} · {timeAgo(data.publishedAt ?? data.createdAt)}
      </div>

      <Card className="rounded-2xl mt-6">
        <CardContent className="p-6 md:p-8">
          <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:font-semibold prose-p:leading-relaxed prose-li:my-1 prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.bodyMarkdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </article>
  )
}
