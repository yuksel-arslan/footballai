'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import {
  Sun,
  Moon,
  Monitor,
  PanelLeft,
  PanelTop,
  User as UserIcon,
  Heart,
  LogOut,
  Palette,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'

/** A single selectable option card used by the segmented selectors below. */
function OptionCard({
  active,
  icon,
  label,
  desc,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  desc?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        minWidth: 120,
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 14,
        border: `1.5px solid ${active ? 'var(--c1)' : 'var(--line)'}`,
        background: active
          ? 'color-mix(in srgb, var(--c1) 10%, transparent)'
          : 'var(--panel)',
        cursor: 'pointer',
        transition: 'border-color .15s, background .15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontWeight: 600,
          fontSize: 14,
          color: active ? 'var(--c1)' : 'var(--ink, inherit)',
        }}
      >
        {icon}
        {label}
      </span>
      {desc && (
        <span style={{ fontSize: 12, color: 'var(--dim)' }}>{desc}</span>
      )}
    </button>
  )
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-h">
        <span style={{ display: 'flex', color: 'var(--c1)' }}>{icon}</span>
        <h3>{title}</h3>
        {hint && <span className="hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function SettingsClient() {
  const { theme, setTheme } = useTheme()
  const { layoutMode, setLayoutMode } = useI18n()
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Theme/layout read from storage on the client only — avoid hydration skew.
  useEffect(() => setMounted(true), [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Hesap</div>
          <h1 style={{ marginTop: 6 }}>Ayarlar</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Görünüm, düzen ve hesap tercihlerini buradan yönet.
          </div>
        </div>
      </div>

      {/* Görünüm — tema */}
      <Section icon={<Palette size={18} />} title="Görünüm" hint="Tema">
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            opacity: mounted ? 1 : 0.5,
            pointerEvents: mounted ? 'auto' : 'none',
          }}
        >
          <OptionCard
            active={mounted && theme === 'light'}
            icon={<Sun size={16} />}
            label="Açık"
            desc="Aydınlık arayüz"
            onClick={() => setTheme('light')}
          />
          <OptionCard
            active={mounted && theme === 'dark'}
            icon={<Moon size={16} />}
            label="Koyu"
            desc="Karanlık arayüz"
            onClick={() => setTheme('dark')}
          />
          <OptionCard
            active={mounted && theme === 'system'}
            icon={<Monitor size={16} />}
            label="Sistem"
            desc="Cihaz ayarını izle"
            onClick={() => setTheme('system')}
          />
        </div>
      </Section>

      {/* Düzen */}
      <Section
        icon={<SlidersHorizontal size={18} />}
        title="Düzen"
        hint="Menü yerleşimi"
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            opacity: mounted ? 1 : 0.5,
            pointerEvents: mounted ? 'auto' : 'none',
          }}
        >
          <OptionCard
            active={mounted && layoutMode === 'sidebar'}
            icon={<PanelLeft size={16} />}
            label="Kenar çubuğu"
            desc="Sol menü"
            onClick={() => setLayoutMode('sidebar')}
          />
          <OptionCard
            active={mounted && layoutMode === 'header'}
            icon={<PanelTop size={16} />}
            label="Üst menü"
            desc="Üstte yatay menü"
            onClick={() => setLayoutMode('header')}
          />
        </div>
      </Section>

      {/* Hesap */}
      <Section icon={<ShieldCheck size={18} />} title="Hesap">
        {isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'var(--panel)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background:
                    'linear-gradient(100deg, var(--c1), var(--c2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {(user?.fullName || user?.email || '?')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {user?.fullName || 'Kullanıcı'}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/profile" className="settings-link">
                <UserIcon size={15} /> Profili düzenle
              </a>
              <a href="/favorites" className="settings-link">
                <Heart size={15} /> Favoriler
              </a>
              <button
                type="button"
                className="settings-link settings-link--danger"
                onClick={async () => {
                  await logout()
                  router.push('/login')
                }}
              >
                <LogOut size={15} /> Çıkış yap
              </button>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Hesap ayarların için{' '}
            <a href="/login" style={{ color: 'var(--c2)' }}>
              giriş yap
            </a>
            . Görünüm ve düzen tercihlerin giriş yapmadan da bu cihazda
            saklanır.
          </p>
        )}
      </Section>
    </div>
  )
}
