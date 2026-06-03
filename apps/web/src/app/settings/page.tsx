import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ayarlar' }

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Hesap</div>
          <h1 style={{ marginTop: 6 }}>Ayarlar</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Profil, bildirim ve güvenlik tercihlerini buradan yönet.
          </div>
        </div>
      </div>
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Ayarlar yakında burada olacak. Profilini düzenlemek için{' '}
          <a href="/profile" style={{ color: 'var(--c2)' }}>
            profil sayfasına
          </a>{' '}
          gidebilirsin.
        </p>
      </div>
    </div>
  )
}
