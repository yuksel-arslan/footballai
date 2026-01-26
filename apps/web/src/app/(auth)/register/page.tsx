'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check password match
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kayıt başarısız')
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
      <h1 className="text-2xl font-bold text-center mb-2">Kayıt Ol</h1>
      <p className="text-muted-foreground text-center mb-6">
        Yeni hesap oluşturun
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ad Soyad"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email adresiniz"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
            required
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
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
            placeholder="Şifre tekrar"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-[#8B5CF6] transition-colors"
            required
          />
        </div>

        {/* Password Requirements */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Şifre gereksinimleri:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>En az 8 karakter</li>
            <li>En az bir büyük harf</li>
            <li>En az bir küçük harf</li>
            <li>En az bir rakam</li>
          </ul>
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
            'Kayıt Ol'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      {/* Google Register */}
      <a
        href="/api/auth/google"
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium">Google ile kayıt ol</span>
      </a>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Zaten hesabınız var mı?{' '}
        <Link href="/login" className="text-[#8B5CF6] hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  )
}
