'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Shield,
  Globe,
  Palette,
  LogOut,
  Trash2,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Send,
  Link2,
  Unlink,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfilePage() {
  const router = useRouter()
  const { language } = useI18n()
  const { user, logout } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameInitialized, setNameInitialized] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [telegramCode, setTelegramCode] = useState('')
  const [telegramLinking, setTelegramLinking] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)
  const [telegramSuccess, setTelegramSuccess] = useState(false)

  // Initialize form fields when profile loads
  if (profile && !nameInitialized) {
    setName(profile.fullName || '')
    setEmail(profile.email || '')
    setNameInitialized(true)
  }

  const labels = {
    title: language === 'tr' ? 'Profil' : 'Profile',
    subtitle:
      language === 'tr'
        ? 'Hesap ayarlarınızı yönetin'
        : 'Manage your account settings',
    personalInfo:
      language === 'tr' ? 'Kişisel Bilgiler' : 'Personal Information',
    fullName: language === 'tr' ? 'Ad Soyad' : 'Full Name',
    emailLabel: language === 'tr' ? 'Email' : 'Email',
    save: language === 'tr' ? 'Kaydet' : 'Save',
    saving: language === 'tr' ? 'Kaydediliyor...' : 'Saving...',
    saved: language === 'tr' ? 'Kaydedildi' : 'Saved',
    security: language === 'tr' ? 'Güvenlik' : 'Security',
    twoFactor: language === 'tr' ? '2 Faktörlü Doğrulama' : 'Two-Factor Auth',
    twoFactorEnabled: language === 'tr' ? 'Aktif' : 'Enabled',
    twoFactorDisabled: language === 'tr' ? 'Devre Dışı' : 'Disabled',
    emailVerified: language === 'tr' ? 'Email Doğrulandı' : 'Email Verified',
    emailNotVerified:
      language === 'tr' ? 'Email Doğrulanmadı' : 'Email Not Verified',
    preferences: language === 'tr' ? 'Tercihler' : 'Preferences',
    languagePref: language === 'tr' ? 'Dil' : 'Language',
    themePref: language === 'tr' ? 'Tema' : 'Theme',
    darkTheme: language === 'tr' ? 'Karanlık' : 'Dark',
    lightTheme: language === 'tr' ? 'Aydınlık' : 'Light',
    dangerZone: language === 'tr' ? 'Tehlikeli Bölge' : 'Danger Zone',
    deleteAccount: language === 'tr' ? 'Hesabı Sil' : 'Delete Account',
    deleteWarning:
      language === 'tr'
        ? 'Bu işlem geri alınamaz. Tüm verileriniz silinecektir.'
        : 'This action cannot be undone. All your data will be permanently deleted.',
    confirmDelete:
      language === 'tr' ? 'Evet, Hesabımı Sil' : 'Yes, Delete My Account',
    cancel: language === 'tr' ? 'İptal' : 'Cancel',
    logoutLabel: language === 'tr' ? 'Çıkış Yap' : 'Log Out',
    memberSince: language === 'tr' ? 'Üyelik' : 'Member Since',
    lastLogin: language === 'tr' ? 'Son Giriş' : 'Last Login',
    telegram: 'Telegram',
    telegramDesc:
      language === 'tr'
        ? 'Telegram bildirimleri almak için hesabınızı bağlayın'
        : 'Link your account to receive Telegram notifications',
    telegramLinked: language === 'tr' ? 'Telegram Bağlı' : 'Telegram Connected',
    telegramNotLinked:
      language === 'tr' ? 'Telegram Bağlı Değil' : 'Telegram Not Connected',
    telegramStep1:
      language === 'tr'
        ? "1. Telegram'da @FootballAI_Bot botuna /start yazın"
        : '1. Send /start to @FootballAI_Bot on Telegram',
    telegramStep2:
      language === 'tr'
        ? '2. Botun verdiği 6 haneli kodu buraya girin'
        : '2. Enter the 6-digit code from the bot here',
    telegramCodePlaceholder:
      language === 'tr'
        ? 'Kodu girin (ör: A1B2C3)'
        : 'Enter code (e.g. A1B2C3)',
    telegramLink: language === 'tr' ? 'Bağla' : 'Link',
    telegramUnlink: language === 'tr' ? 'Bağlantıyı Kes' : 'Unlink',
    telegramLinking: language === 'tr' ? 'Bağlanıyor...' : 'Linking...',
    telegramConnected:
      language === 'tr' ? 'Bağlantı başarılı!' : 'Connected successfully!',
    telegramNotifications: language === 'tr' ? 'Bildirimler' : 'Notifications',
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, email })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      // Error handled by mutation
    }
  }

  const handleTelegramLink = async () => {
    if (!telegramCode.trim()) return
    setTelegramLinking(true)
    setTelegramError(null)
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: telegramCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!data.success) {
        setTelegramError(data.error || 'Bağlantı başarısız')
      } else {
        setTelegramSuccess(true)
        setTelegramCode('')
        setTimeout(() => setTelegramSuccess(false), 3000)
        // Refetch profile to update UI
        window.location.reload()
      }
    } catch {
      setTelegramError(
        language === 'tr'
          ? 'Bağlantı sırasında hata oluştu'
          : 'Connection error'
      )
    } finally {
      setTelegramLinking(false)
    }
  }

  const handleTelegramUnlink = async () => {
    try {
      const res = await fetch('/api/telegram/link', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      }
    } catch {
      // silently fail
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="w-full px-3 sm:px-4 py-6 space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="w-full px-3 sm:px-4 pb-8 max-w-2xl">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
            {labels.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {labels.subtitle}
          </p>
        </div>

        {/* User Avatar & Info */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white text-xl font-bold shrink-0">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                (profile?.fullName || user?.fullName || 'U')
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {profile?.fullName || user?.fullName || labels.title}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {profile?.email || user?.email}
              </p>
              {profile?.isAdmin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Member since / Last login */}
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            {profile?.createdAt && (
              <span>
                {labels.memberSince}:{' '}
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            )}
            {profile?.lastLoginAt && (
              <span>
                {labels.lastLogin}:{' '}
                {new Date(profile.lastLoginAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#2563EB]" />
            <h3 className="font-semibold text-sm">{labels.personalInfo}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {labels.fullName}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-[#2563EB] transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {labels.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-[#2563EB] transition-colors text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              }}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {labels.saving}
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  {labels.saved}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {labels.save}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#0EA5E9]" />
            <h3 className="font-semibold text-sm">{labels.security}</h3>
          </div>

          <div className="space-y-3">
            {/* 2FA Status */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{labels.twoFactor}</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.twoFactorEnabled
                    ? labels.twoFactorEnabled
                    : labels.twoFactorDisabled}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile?.twoFactorEnabled
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {profile?.twoFactorEnabled ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* Email Verification */}
            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.emailVerified
                    ? labels.emailVerified
                    : labels.emailNotVerified}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile?.emailVerified
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                }`}
              >
                {profile?.emailVerified ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#FBBF24]" />
            <h3 className="font-semibold text-sm">{labels.preferences}</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.languagePref}</span>
              </div>
              <span className="text-sm text-muted-foreground capitalize">
                {language}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{labels.themePref}</span>
              </div>
              <span className="text-sm text-muted-foreground capitalize">
                {profile?.theme || 'dark'}
              </span>
            </div>
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-4 h-4 text-[#0EA5E9]" />
            <h3 className="font-semibold text-sm">{labels.telegram}</h3>
          </div>

          {profile?.telegramChatId ? (
            // Telegram is linked
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {labels.telegramLinked}
                    </p>
                    {profile.telegramUsername && (
                      <p className="text-xs text-muted-foreground">
                        @{profile.telegramUsername}
                      </p>
                    )}
                    {profile.telegramConnectedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(
                          profile.telegramConnectedAt
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                  <Check className="w-3 h-3 inline mr-1" />
                  {profile.telegramNotifications ? 'ON' : 'OFF'}
                </div>
              </div>

              <button
                onClick={handleTelegramUnlink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <Unlink className="w-3 h-3" />
                {labels.telegramUnlink}
              </button>
            </div>
          ) : (
            // Telegram not linked - show link form
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {labels.telegramDesc}
              </p>

              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {labels.telegramStep1}
                </p>
                <p className="text-xs text-muted-foreground">
                  {labels.telegramStep2}
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramCode}
                  onChange={(e) => {
                    setTelegramCode(e.target.value.toUpperCase())
                    setTelegramError(null)
                  }}
                  placeholder={labels.telegramCodePlaceholder}
                  maxLength={6}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-[#0EA5E9] transition-colors text-sm uppercase tracking-widest text-center font-mono"
                />
                <button
                  onClick={handleTelegramLink}
                  disabled={telegramLinking || telegramCode.length < 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9, #2563EB)',
                  }}
                >
                  {telegramLinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {telegramLinking
                    ? labels.telegramLinking
                    : labels.telegramLink}
                </button>
              </div>

              {telegramError && (
                <p className="text-xs text-destructive">{telegramError}</p>
              )}
              {telegramSuccess && (
                <p className="text-xs text-green-500">
                  {labels.telegramConnected}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium mb-4"
        >
          <LogOut className="w-4 h-4" />
          {labels.logoutLabel}
        </button>

        {/* Danger Zone */}
        <div className="bg-card rounded-xl border border-destructive/30 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-sm text-destructive">
              {labels.dangerZone}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {labels.deleteWarning}
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              {labels.deleteAccount}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
              >
                {labels.cancel}
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-destructive hover:opacity-90 transition-opacity">
                {labels.confirmDelete}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
