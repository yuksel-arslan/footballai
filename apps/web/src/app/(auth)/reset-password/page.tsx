'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, Loader2, Check, ArrowLeft } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="neon-card rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-red-500">Geçersiz Bağlantı</h1>
        <p className="text-muted-foreground mb-6">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-[#8B5CF6] hover:underline"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Şifre sıfırlama başarısız')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="neon-card rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Şifre Sıfırlandı</h1>
        <p className="text-muted-foreground mb-6">
          Şifreniz başarıyla sıfırlandı. Giriş sayfasına yönlendiriliyorsunuz...
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[#8B5CF6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Giriş sayfasına git
        </Link>
      </div>
    )
  }

  return (
    <div className="neon-card rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Yeni Şifre Belirle</h1>
      <p className="text-muted-foreground text-center mb-6">
        Yeni şifrenizi girin
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yeni şifre"
            className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni şifre tekrar"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Şifreyi Sıfırla'
          )}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="neon-card rounded-2xl p-8 text-center">Yükleniyor...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
