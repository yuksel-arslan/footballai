'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Settings, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { UserDropdown } from '@/components/auth/user-dropdown'
import { AuthModal } from '@/components/auth/auth-modal'

export function Header() {
  const { isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
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

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent">
              <Settings className="h-5 w-5" />
            </button>

            {/* Auth */}
            {isAuthenticated ? (
              <UserDropdown />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
