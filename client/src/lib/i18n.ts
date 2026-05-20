import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '@/locales/en.json'
import hi from '@/locales/hi.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'zynsource_locale',
      caches: ['localStorage'],
    },
    returnEmptyString: false,
    // Use the English string itself as the key (no separate code keys).
    // When a key isn't found in any bundle, i18next returns it verbatim.
    keySeparator: false,
    nsSeparator: false,
  })

/**
 * Legacy standalone `t` — keeps every `import { t } from '@/lib/i18n'` call
 * working. Note: this doesn't trigger re-renders on language change; for
 * reactive translation in components prefer `useTranslation()` from react-i18next.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params) as string
}

export default i18n
