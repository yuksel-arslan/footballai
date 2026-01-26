'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Trophy,
  Calendar,
  BarChart3,
  Star,
  ChevronLeft,
  ChevronRight,
  Home,
  X,
  Menu,
  Globe,
  Layout,
  Settings,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatedLogo } from '@/components/ui/animated-logo'
import { useI18n } from '@/lib/i18n'

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const pathname = usePathname()
  const { t, language, setLanguage, languageFlags, languageNames, availableLanguages, setLayoutMode } = useI18n()

  const navItems = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/matches', label: t.nav.matches, icon: Calendar },
    { href: '/standings', label: t.nav.standings, icon: Trophy },
    { href: '/predictions', label: t.nav.predictions, icon: BarChart3 },
    { href: '/favorites', label: t.nav.favorites, icon: Star },
    { href: '/admin', label: 'Admin', icon: Settings, admin: true },
  ]

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false)
    setIsLangOpen(false)
  }, [pathname])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false)
        setIsLangOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <AnimatedLogo size={32} />
          <span className="font-bold gradient-text">FutballAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg">{languageFlags[language]}</span>
          </button>
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Language Dropdown */}
        {isLangOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
            <div className="absolute right-4 top-14 w-48 py-2 rounded-xl bg-popover border border-border shadow-lg z-50">
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang)
                    setIsLangOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${
                    language === lang ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <span className="text-lg">{languageFlags[lang]}</span>
                  <span className="text-sm">{languageNames[lang]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 right-0 h-full w-72 z-50 glass-card border-l border-border/50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3">
            <AnimatedLogo size={36} />
            <span className="font-bold gradient-text text-lg">FutballAI</span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="font-medium">{item.label}</span>
                {item.href === '/' && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-red-500 live-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Language Selection */}
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <Globe className="w-3 h-3" />
            Language
          </p>
          <div className="grid grid-cols-3 gap-2">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  language === lang ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
              >
                <span className="text-xl">{languageFlags[lang]}</span>
                <span className="text-[10px]">{languageNames[lang]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Switch to Header */}
        <div className="p-4">
          <button
            onClick={() => setLayoutMode('header')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
          >
            <Layout className="w-4 h-4" />
            {t.layout.header}
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full z-40 flex-col glass-card border-r border-border/50 transition-all duration-300 ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-border/50 flex items-center ${isExpanded ? 'justify-start gap-3' : 'justify-center'}`}>
          <AnimatedLogo size={isExpanded ? 40 : 36} />
          {isExpanded && (
            <span className="font-bold gradient-text text-xl">FutballAI</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-neon-blue'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {isExpanded && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.href === '/' && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-red-500 live-pulse" />
                    )}
                  </>
                )}
                {!isExpanded && item.href === '/' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 live-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className={`p-3 border-t border-border/50 space-y-2`}>
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ${
                !isExpanded ? 'justify-center' : ''
              }`}
            >
              <span className="text-lg">{languageFlags[language]}</span>
              {isExpanded && (
                <>
                  <span className="text-sm flex-1 text-left">{languageNames[language]}</span>
                  <Globe className="w-4 h-4" />
                </>
              )}
            </button>

            {isLangOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                <div className={`absolute bottom-full mb-2 ${isExpanded ? 'left-0 w-full' : 'left-0 w-48'} py-2 rounded-xl bg-popover border border-border shadow-lg z-50`}>
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang)
                        setIsLangOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${
                        language === lang ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      <span className="text-lg">{languageFlags[lang]}</span>
                      <span className="text-sm">{languageNames[lang]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <div className={`flex ${isExpanded ? 'justify-between items-center' : 'justify-center'}`}>
            {isExpanded && <span className="text-xs text-muted-foreground">{t.nav.theme}</span>}
            <ThemeToggle />
          </div>

          {/* Header Mode Toggle */}
          <button
            onClick={() => setLayoutMode('header')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ${
              !isExpanded ? 'justify-center' : ''
            }`}
            title={!isExpanded ? t.layout.header : undefined}
          >
            <Layout className="w-5 h-5" />
            {isExpanded && <span className="text-sm">{t.layout.header}</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all ${
              !isExpanded ? 'justify-center' : ''
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">{t.nav.collapse}</span>
              </>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`} />
      <div className="lg:hidden h-14" />
    </>
  )
}
