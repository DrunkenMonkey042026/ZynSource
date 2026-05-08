import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AuthSplitScreen } from '@/components/AuthSplitScreen'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import { apiError } from '@/lib/api'
import { t } from '@/lib/i18n'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    try {
      const user = await login(values.email, values.password)
      const redirect = (location.state as { from?: { pathname?: string } })?.from?.pathname
      navigate(redirect || (user.role === 'recruiter' ? '/recruiter' : '/jobs'))
    } catch (err) {
      toast({ title: t('Sign in failed'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitScreen>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('Welcome back')}</h1>
      <p className="text-muted-foreground mt-2">{t('Sign in to continue your job search or hiring.')}</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-8">
        <div className="space-y-2">
          <Label htmlFor="email">{t('Email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('Password')}</Label>
          <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full h-11 rounded-full" disabled={submitting}>
          {submitting ? t('Signing in…') : t('Sign in')}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          {t('No account yet?')}{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t('Create one')}
          </Link>
        </p>
      </form>
    </AuthSplitScreen>
  )
}
