import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

export default function NotFound() {
  return (
    <div className="container max-w-md text-center py-24">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2">{t('We couldn\'t find that page.')}</p>
      <Button asChild className="mt-6">
        <Link to="/">{t('Go home')}</Link>
      </Button>
    </div>
  )
}
