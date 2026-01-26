'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy,
  Calendar,
  BarChart3,
  Star,
  Home,
  Menu,
  X,
  Globe,
  Layout,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatedLogo } from '@/components/ui/animated-logo'
import { useI18n } from '@/lib/i18n'

export function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const pathname = usePathname()
  const { t, language, setLanguage, languageFlags, languageNames, availableLanguages, layoutMode, setLayoutMode } = useI18n()

  const navItems = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/matches', label: t.nav.matches, icon: Calendar },
    { href: '/standings', label: t.nav.standings, icon: Trophy },
    { href: '/predictions', label: t.nav.predictions, icon: BarChart3 },
    { href: '/favorites', label: t.nav.favorites, icon: Star },
  ]

  // Close menus on route change
  useEffect(() => {
    setIsMobileOpen(false)
    setIsLangOpen(false)
  }, [pathname])

  // Close on escape key
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <AnimatedLogo size={36} />
              <span className="font-bold gradient-text text-lg hidden sm:block">FutballAI</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-lg">{languageFlags[language]}</span>
                  <Globe className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>

                {isLangOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl bg-popover border border-border shadow-lg z-50">
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
                      <div className="border-t border-border my-2" />
                      <button
                        onClick={() => {
                          setLayoutMode('sidebar')
                          setIsLangOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${
                          layoutMode === 'sidebar' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        <Layout className="w-4 h-4" />
                        <span className="text-sm">{t.layout.sidebar}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <ThemeToggle />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <aside
        className={`md:hidden fixed top-0 right-0 h-full w-72 z-50 glass-card border-l border-border/50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3">
            <AnimatedLogo size={32} />
            <span className="font-bold gradient-text">FutballAI</span>
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
              </Link>
            )
          })}
        </nav>

        {/* Language Selection in Mobile */}
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Language</p>
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

        {/* Switch to Sidebar */}
        <div className="p-4">
          <button
            onClick={() => setLayoutMode('sidebar')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
          >
            <Layout className="w-4 h-4" />
            {t.layout.sidebar}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div className="h-16" />
    </>
  )
}
