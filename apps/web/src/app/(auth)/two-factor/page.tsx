'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'

function TwoFactorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  if (!userId) {
    return (
      <div className="neon-card rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-red-500">Geçersiz İstek</h1>
        <p className="text-muted-foreground mb-6">
          Geçersiz istek. Lütfen tekrar giriş yapın.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[#8B5CF6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Giriş sayfasına dön
        </Link>
      </div>
    )
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Only take last character
    setCode(newCode)

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all fields are filled
    if (newCode.every(c => c) && index === 5) {
      handleSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]

    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i] || ''
    }

    setCode(newCode)

    // Focus appropriate input
    const nextEmptyIndex = newCode.findIndex(c => !c)
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else {
      inputRefs.current[5]?.focus()
      handleSubmit(newCode.join(''))
    }
  }

  const handleSubmit = async (codeString?: string) => {
    const finalCode = codeString || code.join('')

    if (finalCode.length !== 6) {
      setError('Lütfen 6 haneli kodu girin')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: finalCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Doğrulama başarısız')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      // Redirect to home
      router.push('/')
      router.refresh()
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="neon-card rounded-2xl p-8">
      <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-[#8B5CF6]" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">İki Faktörlü Doğrulama</h1>
      <p className="text-muted-foreground text-center mb-6">
        Authenticator uygulamanızdaki 6 haneli kodu girin
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        {/* Code Inputs */}
        <div className="flex justify-center gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
              maxLength={1}
              disabled={loading}
            />
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || code.some(c => !c)}
          className="w-full py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Doğrula'
          )}
        </button>
      </form>

      {/* Backup Code Option */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Authenticator uygulamanıza erişemiyor musunuz?{' '}
        <button
          className="text-[#8B5CF6] hover:underline"
          onClick={() => {
            const backupCode = prompt('Yedek kodunuzu girin (XXXX-XXXX formatında):')
            if (backupCode) {
              handleSubmit(backupCode.replace('-', ''))
            }
          }}
        >
          Yedek kod kullanın
        </button>
      </p>

      {/* Back to Login */}
      <p className="mt-4 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Farklı bir hesapla giriş yap
        </Link>
      </p>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<div className="neon-card rounded-2xl p-8 text-center">Yükleniyor...</div>}>
      <TwoFactorForm />
    </Suspense>
  )
}
