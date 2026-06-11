'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Doğrulama bağlantısı geçersiz (token eksik).')
      return
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (res.ok) {
          setState('ok')
        } else {
          setState('error')
          setMessage(
            json.error || 'Bağlantı geçersiz ya da süresi dolmuş olabilir.'
          )
        }
      })
      .catch(() => {
        setState('error')
        setMessage('Doğrulama servisine ulaşılamadı — tekrar deneyin.')
      })
  }, [token])

  return (
    <div className="page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
        {state === 'working' && (
          <>
            <h1 style={{ fontSize: 22, margin: 0 }}>E-posta doğrulanıyor…</h1>
            <p className="muted" style={{ marginTop: 10, fontSize: 14 }}>
              Lütfen bekleyin.
            </p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div style={{ fontSize: 40 }}>✅</div>
            <h1 style={{ fontSize: 22, margin: '10px 0 0' }}>
              E-posta doğrulandı
            </h1>
            <p className="muted" style={{ marginTop: 10, fontSize: 14 }}>
              Hesabınız doğrulandı. Artık tüm özellikleri kullanabilirsiniz.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                marginTop: 18,
                padding: '10px 22px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Giriş yap
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ fontSize: 22, margin: '10px 0 0' }}>
              Doğrulama başarısız
            </h1>
            <p className="muted" style={{ marginTop: 10, fontSize: 14 }}>
              {message}
            </p>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Yine de <Link href="/login" style={{ color: 'var(--c2)' }}>giriş yapmayı</Link>{' '}
              deneyebilirsiniz — doğrulama girişi engellemez.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}
