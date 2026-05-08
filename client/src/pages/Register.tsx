import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AuthSplitScreen } from '@/components/AuthSplitScreen'
import { useAuth, type Role } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import { apiError } from '@/lib/api'
import { t } from '@/lib/i18n'

const schema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email(),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function Register() {
  const { register: doRegister } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [role, setRole] = useState<Role>('seeker')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } })

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    try {
      const user = await doRegister({ ...values, role })
      toast({ title: t('Welcome to ZynSource!'), variant: 'success' })
      navigate(user.role === 'recruiter' ? '/recruiter' : '/me/profile')
    } catch (err) {
      toast({ title: t('Registration failed'), description: apiError(err), variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitScreen>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('Create your account')}</h1>
      <p className="text-muted-foreground mt-2">{t('Pick the side you\'re on, then we\'ll set you up.')}</p>

      <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="seeker">{t('I\'m looking for jobs')}</TabsTrigger>
          <TabsTrigger value="recruiter">{t('I\'m hiring')}</TabsTrigger>
        </TabsList>
        <TabsContent value="seeker" className="text-sm text-muted-foreground mt-3">
          {t('Build a profile, upload your resume, get AI-ranked job matches.')}
        </TabsContent>
        <TabsContent value="recruiter" className="text-sm text-muted-foreground mt-3">
          {t('Post jobs and manage applicants through your hiring pipeline.')}
        </TabsContent>
      </Tabs>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t('Full name')}</Label>
          <Input id="name" autoComplete="name" {...form.register('name')} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('Email')}</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('Password')}</Label>
          <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full h-11 rounded-full" disabled={submitting}>
          {submitting ? t('Creating account…') : t('Create account')}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('Sign in')}
          </Link>
        </p>
      </form>
    </AuthSplitScreen>
  )
}
