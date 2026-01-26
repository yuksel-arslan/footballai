'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, type Language, type TranslationKeys, languageNames, languageFlags } from './translations'

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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>('sidebar')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load from localStorage on mount
    const savedLang = localStorage.getItem('futballai-language') as Language
    const savedLayout = localStorage.getItem('futballai-layout') as LayoutMode

    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang)
    }
    if (savedLayout && (savedLayout === 'sidebar' || savedLayout === 'header')) {
      setLayoutModeState(savedLayout)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('futballai-language', lang)
  }, [])

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode)
    localStorage.setItem('futballai-layout', mode)
  }, [])

  const t = translations[language]

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    layoutMode,
    setLayoutMode,
    languageNames,
    languageFlags,
    availableLanguages: Object.keys(translations) as Language[],
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ ...value, language: 'en', t: translations.en, layoutMode: 'sidebar' }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
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
