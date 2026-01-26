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
