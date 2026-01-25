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
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AnimatedLogo } from '@/components/ui/animated-logo'

const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/matches', label: 'Maçlar', icon: Calendar },
  { href: '/standings', label: 'Puan Durumu', icon: Trophy },
  { href: '/predictions', label: 'Tahminler', icon: BarChart3 },
  { href: '/favorites', label: 'Favoriler', icon: Star },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false)
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
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
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
          <div className={`flex ${isExpanded ? 'justify-between items-center' : 'justify-center'}`}>
            {isExpanded && <span className="text-xs text-muted-foreground">Tema</span>}
            <ThemeToggle />
          </div>

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
                <span className="text-sm">Daralt</span>
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
