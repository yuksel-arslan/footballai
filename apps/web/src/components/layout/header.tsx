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
  Settings,
  LogIn,
  Search,
  Coins,
  FileText,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatedLogo } from '@/components/ui/animated-logo'
import { SearchBar } from '@/components/ui/search-bar'
import { NotificationBell } from '@/components/ui/notification-bell'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useCredits } from '@/hooks/use-credits'

export function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  const {
    t,
    language,
    setLanguage,
    languageFlags,
    languageNames,
    availableLanguages,
    layoutMode,
    setLayoutMode,
  } = useI18n()
  const { user, isAuthenticated } = useAuth()
  const { data: credits } = useCredits()

  const navItems = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/matches', label: t.nav.matches, icon: Calendar },
    { href: '/standings', label: t.nav.standings, icon: Trophy },
    { href: '/predictions', label: t.nav.predictions, icon: BarChart3 },
    { href: '/reports', label: 'Raporlar', icon: FileText },
    { href: '/favorites', label: t.nav.favorites, icon: Star },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), [])

  // Close menus on route change
  useEffect(() => {
    setIsMobileOpen(false)
    setIsLangOpen(false)
    setIsSearchOpen(false)
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

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo — icon-only on mobile so the menu button always fits */}
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/logo.svg"
                alt="FootballAI"
                className="h-8 w-8 md:hidden"
                draggable={false}
              />
              <span className="hidden md:inline-flex">
                <AnimatedLogo size={150} />
              </span>
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
                    <item.icon
                      className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline text-xs text-muted-foreground/50">
                  Ctrl+K
                </span>
              </button>

              {/* Notifications */}
              {isAuthenticated && <NotificationBell />}

              {/* Credit Balance */}
              {isAuthenticated && (
                <Link
                  href="/pricing"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 hover:from-amber-500/20 hover:to-yellow-500/20 transition-colors"
                  title={
                    language === 'tr' ? 'Kredi paketleri' : 'Credit packages'
                  }
                >
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    {credits ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground">cr</span>
                </Link>
              )}

              {/* Profile / Login */}
              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00E07A] to-[#22D3EE] flex items-center justify-center text-white text-[10px] font-bold">
                    {(user?.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate max-w-[100px]">
                    {user?.fullName || user?.email?.split('@')[0]}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'tr' ? 'Giriş' : 'Login'}</span>
                </Link>
              )}

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
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLangOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl bg-popover border border-border shadow-lg z-50">
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setLanguage(lang)
                            setIsLangOpen(false)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${
                            language === lang
                              ? 'bg-primary/10 text-primary'
                              : ''
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
                          layoutMode === 'sidebar'
                            ? 'text-primary'
                            : 'text-muted-foreground'
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
          <Link href="/" className="flex items-center">
            <AnimatedLogo size={128} />
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
                <item.icon
                  className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Profile / Login - Mobile */}
        <div className="px-4 pt-2">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === '/profile'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00E07A] to-[#22D3EE] flex items-center justify-center text-white text-xs font-bold">
                {(user?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{user?.fullName || 'Profile'}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-medium">
                {language === 'tr' ? 'Giriş Yap' : 'Login'}
              </span>
            </Link>
          )}
        </div>

        {/* Language Selection in Mobile */}
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Language</p>
          <div className="grid grid-cols-3 gap-2">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  language === lang
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50'
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

      {/* Search Modal */}
      <SearchBar isOpen={isSearchOpen} onClose={handleCloseSearch} />
    </>
  )
}
