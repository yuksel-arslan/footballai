'use client'

import Link from 'next/link'
import { Search, Trophy, Calendar, BarChart3, Star } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Canlı', icon: <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" /> },
  { href: '/matches', label: 'Maçlar', icon: <Calendar className="w-4 h-4" /> },
  { href: '/standings', label: 'Puan Durumu', icon: <Trophy className="w-4 h-4" /> },
  { href: '/predictions', label: 'Tahminler', icon: <BarChart3 className="w-4 h-4" /> },
  { href: '/favorites', label: 'Favoriler', icon: <Star className="w-4 h-4" /> },
]

export function Header() {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300">
              <span className="text-xl">⚽</span>
              <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold gradient-text">FutballAI</span>
              <p className="text-[10px] text-muted-foreground -mt-1">Yapay Zeka Tahminleri</p>
            </div>
          </Link>

          {/* Search */}
          <div className="flex flex-1 items-center justify-center px-4 max-w-xl">
            <div className={`relative w-full transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Takım, lig veya maç ara..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="h-11 w-full rounded-xl border border-border/50 bg-muted/30 pl-11 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-background transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center gap-1 rounded-md border border-border/50 bg-muted/50 px-2 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 pb-3 overflow-x-auto scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
