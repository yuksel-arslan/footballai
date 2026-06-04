'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const urlError = searchParams.get('error')
  const errorDetail = searchParams.get('detail')

  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    urlError === 'google_failed'
      ? `Google ile giriş başarısız${errorDetail ? `: ${errorDetail}` : '. Lütfen tekrar deneyin veya e-posta ile girin.'}`
      : ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint =
        mode === 'register' ? '/api/auth/register' : '/api/auth/login'
      const payload =
        mode === 'register'
          ? { email, password, fullName }
          : { email, password }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(
          data.error ||
            (mode === 'register' ? 'Kayıt başarısız' : 'Giriş başarısız')
        )
        return
      }
      if (data.requires2FA) {
        router.push(`/two-factor?userId=${data.userId}`)
        return
      }
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const isReg = mode === 'register'

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="seg" role="tablist">
          <button
            type="button"
            className={!isReg ? 'on' : ''}
            onClick={() => setMode('login')}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            className={isReg ? 'on' : ''}
            onClick={() => setMode('register')}
          >
            Kayıt Ol
          </button>
        </div>

        {isReg && <span className="age">18+ · Sorumlu oyna</span>}

        {error && <div className="auth-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isReg && (
            <div className="field">
              <label>Ad Soyad</label>
              <input
                type="text"
                placeholder="Adın ve soyadın"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label>E-posta</label>
            <input
              type="email"
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isReg && (
            <div className="row-between">
              <label className="remember">
                <input type="checkbox" defaultChecked /> Beni hatırla
              </label>
              <Link href="/forgot-password">Şifremi unuttum</Link>
            </div>
          )}

          <button
            type="submit"
            className="cta"
            style={{ width: '100%', marginTop: isReg ? 8 : 0 }}
            disabled={loading}
          >
            {loading
              ? 'Lütfen bekleyin…'
              : isReg
                ? 'Hesap Oluştur'
                : 'Giriş Yap'}
          </button>
        </form>

        <div className="divider">veya</div>

        <div className="social">
          <a href="/api/auth/google" style={{ flex: 1 }}>
            <button type="button" style={{ width: '100%' }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#fff"
                  d="M21.35 11.1H12v3.2h5.35c-.25 1.5-1.7 4.4-5.35 4.4-3.2 0-5.85-2.65-5.85-5.9S8.8 6.9 12 6.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 4.4 14.6 3.5 12 3.5 6.95 3.5 2.85 7.6 2.85 12.7S6.95 21.9 12 21.9c5.3 0 8.8-3.7 8.8-8.95 0-.6-.05-1.2-.15-1.85z"
                />
              </svg>
              Google ile devam et
            </button>
          </a>
        </div>

        <div className="terms">
          Devam ederek <a>Kullanım Şartları</a> ve <a>Gizlilik Politikası</a>
          &apos;nı kabul edersin.
        </div>
      </div>
    </div>
  )
}
