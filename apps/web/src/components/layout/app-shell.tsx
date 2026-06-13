'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  CalendarDays,
  TrendingUp,
  BookText,
  Star,
  Settings,
  Shield,
  LogOut,
  Coins,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import { useCredits } from '@/hooks/use-credits'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const NAV = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/matches', label: 'Maçlar' },
  { href: '/standings', label: 'Puan Durumu' },
  { href: '/predictions', label: 'Değerli Bahisler' },
  { href: '/reports', label: 'Raporlar' },
  { href: '/performance', label: 'Performans' },
  { href: '/favorites', label: 'Favoriler' },
]

function initials(name?: string | null, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    const two = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
    return (two || parts[0].slice(0, 2)).toUpperCase()
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 11px',
  borderRadius: 9,
  fontSize: 13.5,
  color: 'var(--txt)',
  width: '100%',
  background: 'none',
  border: 0,
  cursor: 'pointer',
  textAlign: 'left',
}

export function AppShell() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { data: credits } = useCredits()
  const [menuOpen, setMenuOpen] = useState(false)

  // Single source of truth for auth: mirror the real session (/api/auth/me)
  // into the Zustand store that favorites, the favorite-star and prediction
  // gates read — otherwise that store is never populated and a signed-in user
  // is wrongly treated as a guest.
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  useEffect(() => {
    if (user) {
      setUser({ id: user.id, email: user.email, name: user.fullName ?? '' })
    } else {
      clearUser()
    }
  }, [user, setUser, clearUser])
  const close = () => setMenuOpen(false)

  return (
    <>
      <div className="topbar">
        <Link className="brand" href="/">
          <img src="/brand/footballai-icon.svg" width={32} height={32} alt="" />
          <span className="wm">
            <span>Football</span>
            <span className="ai">AI</span>
          </span>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? 'on' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <span className="spacer" />
        <div className="search">
          Takım, maç ara… <span className="k">⌘K</span>
        </div>

        {user && (
          <Link
            className="cred"
            href="/pricing"
            title="Kredi durumu — paket al"
          >
            <Coins size={15} />
            <span className="n">{credits ?? 0}</span>
            <span className="u">kredi</span>
          </Link>
        )}

        <ThemeToggle />

        {user ? (
          <div className="usermenu">
            <button
              type="button"
              className="avatar"
              aria-label="Hesap menüsü"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {initials(user.fullName, user.email)}
            </button>
            <div className={menuOpen ? 'menu open' : 'menu'}>
              <div className="who">
                <div className="n">{user.fullName ?? 'Hesabım'}</div>
                <div className="e">{user.email}</div>
              </div>
              <div className="sep" />
              <Link href="/performance" onClick={close}>
                <TrendingUp size={16} /> Performans Merkezi
              </Link>
              <Link href="/journal" onClick={close}>
                <BookText size={16} /> Bahis Defterim
              </Link>
              <Link href="/favorites" onClick={close}>
                <Star size={16} /> Favoriler
              </Link>
              <Link href="/settings" onClick={close}>
                <Settings size={16} /> Ayarlar
              </Link>
              {user.isAdmin && (
                <Link href="/admin" onClick={close}>
                  <Shield size={16} /> Admin
                </Link>
              )}
              <div className="sep" />
              <button
                type="button"
                style={menuItemStyle}
                onClick={() => {
                  close()
                  void logout()
                }}
              >
                <LogOut size={16} /> Çıkış
              </button>
            </div>
          </div>
        ) : (
          <Link className="login" href="/login">
            Giriş
          </Link>
        )}
      </div>

      {/* mobile bottom tab bar */}
      <nav className="botnav">
        <Link href="/" className={isActive(pathname, '/') ? 'on' : ''}>
          <Home strokeWidth={2} />
          Ana Sayfa
        </Link>
        <Link
          href="/matches"
          className={isActive(pathname, '/matches') ? 'on' : ''}
        >
          <CalendarDays strokeWidth={2} />
          Maçlar
        </Link>
        <Link
          href="/predictions"
          className={isActive(pathname, '/predictions') ? 'on' : ''}
        >
          <TrendingUp strokeWidth={2} />
          Değer
        </Link>
        <Link
          href="/favorites"
          className={isActive(pathname, '/favorites') ? 'on' : ''}
        >
          <Star strokeWidth={2} />
          Favoriler
        </Link>
      </nav>
    </>
  )
}
