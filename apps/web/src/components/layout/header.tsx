'use client'

import Link from 'next/link'
import { Search, Settings } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">
              ⚽
            </span>
          </div>
          <span className="text-lg font-bold">FootballAI</span>
        </Link>

        {/* Search */}
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Takım, lig ara..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Settings */}
        <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
