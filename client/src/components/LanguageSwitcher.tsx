import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const active = i18n.language?.startsWith('hi') ? 'hi' : 'en'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full hover:bg-accent transition-colors text-sm font-medium"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{LANGS.find((l) => l.code === active)?.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              i18n.changeLanguage(l.code)
              localStorage.setItem('zynsource_locale', l.code)
            }}
            className={active === l.code ? 'font-semibold text-primary' : ''}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
