'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  translations,
  type Language,
  type TranslationKeys,
  languageNames,
  languageFlags,
} from './translations'

type LayoutMode = 'sidebar' | 'header'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
  languageNames: typeof languageNames
  languageFlags: typeof languageFlags
  availableLanguages: Language[]
}

const I18nContext = createContext<I18nContextType | null>(null)

// Translation feature removed — the app is Turkish-only. Anyone who wants
// another language can use the browser's built-in Google Translate.
const LANGUAGE: Language = 'tr'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>('sidebar')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedLayout = localStorage.getItem('footballai-layout') as LayoutMode
    if (savedLayout === 'sidebar' || savedLayout === 'header') {
      setLayoutModeState(savedLayout)
    }
  }, [])

  const setLanguage = useCallback(() => {}, []) // no-op: Turkish-only

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode)
    localStorage.setItem('footballai-layout', mode)
  }, [])

  const value: I18nContextType = {
    language: LANGUAGE,
    setLanguage,
    t: translations[LANGUAGE],
    layoutMode,
    setLayoutMode,
    languageNames,
    languageFlags,
    availableLanguages: [LANGUAGE],
  }

  // Prevent hydration mismatch (layout only — language is constant)
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ ...value, layoutMode: 'sidebar' }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useTranslation() {
  const { t, language } = useI18n()
  return { t, language }
}
