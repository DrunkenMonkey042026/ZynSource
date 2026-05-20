import { Helmet } from 'react-helmet-async'

interface Props {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
}

const DEFAULT_DESC = 'ZynSource — AI-powered hiring platform for India. Find your next role or your next hire.'

export function SeoHead({ title, description = DEFAULT_DESC, image, url, type = 'website' }: Props) {
  const fullTitle = title.includes('ZynSource') ? title : `${title} · ZynSource`
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}
