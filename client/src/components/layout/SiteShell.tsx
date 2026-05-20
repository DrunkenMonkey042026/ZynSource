import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Briefcase, LogOut, User as UserIcon, LayoutDashboard, FileText, Plus, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/NotificationBell'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { t } from '@/lib/i18n'
import type { ReactNode } from 'react'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems =
    user?.role === 'recruiter'
      ? [
          { to: '/recruiter', label: t('Dashboard'), icon: LayoutDashboard },
          { to: '/recruiter/jobs', label: t('My jobs'), icon: Briefcase },
          { to: '/recruiter/jobs/new', label: t('Post a job'), icon: Plus },
        ]
      : user?.role === 'seeker'
      ? [
          { to: '/jobs', label: t('Find jobs'), icon: Search },
          { to: '/me/applications', label: t('My applications'), icon: FileText },
          { to: '/me/profile', label: t('My profile'), icon: UserIcon },
        ]
      : [
          { to: '/jobs', label: t('Find jobs'), icon: Search },
        ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white text-sm font-bold shadow-sm">
              Z
            </span>
            <span>ZynSource</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/recruiter'}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user && <NotificationBell />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border p-1 pr-3 hover:bg-accent transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">{user.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'seeker' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/me/profile')}>
                        <UserIcon className="h-4 w-4 mr-2" /> {t('My profile')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/me/applications')}>
                        <FileText className="h-4 w-4 mr-2" /> {t('My applications')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/me/alerts')}>
                        <FileText className="h-4 w-4 mr-2" /> {t('My alerts')}
                      </DropdownMenuItem>
                    </>
                  )}
                  {user.role === 'recruiter' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/recruiter')}>
                        <LayoutDashboard className="h-4 w-4 mr-2" /> {t('Dashboard')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/recruiter/jobs')}>
                        <Briefcase className="h-4 w-4 mr-2" /> {t('My jobs')}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> {t('Sign out')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">{t('Sign in')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">{t('Get started')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-slate-50 py-8 mt-12">
        <div className="container flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} ZynSource. {t('Connecting talent with opportunity.')}</div>
          <div className="flex gap-4">
            <Link to="/jobs" className="hover:text-foreground">{t('Browse jobs')}</Link>
            <Link to="/register" className="hover:text-foreground">{t('Post a job')}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
