'use client'

import Link from 'next/link'
import { Search, Trophy, Calendar, BarChart3, Star, Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Canlı', icon: <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" /> },
  { href: '/matches', label: 'Maçlar', icon: <Calendar className="w-4 h-4" /> },
  { href: '/standings', label: 'Puan', icon: <Trophy className="w-4 h-4" /> },
  { href: '/predictions', label: 'Tahmin', icon: <BarChart3 className="w-4 h-4" /> },
  { href: '/favorites', label: 'Favori', icon: <Star className="w-4 h-4" /> },
]

export function Header() {
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Top Bar */}
        <div className="flex h-12 sm:h-14 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25">
              <span className="text-base sm:text-lg">⚽</span>
            </div>
            <span className="text-base sm:text-lg font-bold gradient-text hidden xs:inline">FutballAI</span>
          </Link>

          {/* Search - Hidden on very small screens */}
          <div className="hidden sm:flex flex-1 items-center justify-center px-2 max-w-md">
            <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ara..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-muted/50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden sm:flex items-center gap-0.5 pb-2 overflow-x-auto scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="sm:hidden py-2 border-t border-border/30">
            <div className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
            {/* Mobile Search */}
            <div className="mt-2 px-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Takım veya maç ara..."
                  className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
