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
  Link,
  Unlink,
  MessageCircle,
  Send,
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
  const [telegramUnlinking, setTelegramUnlinking] = useState(false)
  const [discordLinking, setDiscordLinking] = useState(false)
  const [discordUnlinking, setDiscordUnlinking] = useState(false)
  const [connectionError, setConnectionError] = useState('')

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
    connections: language === 'tr' ? 'Bağlantılar' : 'Connections',
    telegram: 'Telegram',
    discord: 'Discord',
    connected: language === 'tr' ? 'Bağlı' : 'Connected',
    notConnected: language === 'tr' ? 'Bağlı değil' : 'Not Connected',
    connect: language === 'tr' ? 'Bağla' : 'Connect',
    disconnect: language === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect',
    telegramCodePlaceholder:
      language === 'tr'
        ? 'Telegram botundan aldığınız kodu girin'
        : 'Enter the code from Telegram bot',
    telegramHint:
      language === 'tr'
        ? 'Telegram botuna /start yazarak bağlantı kodu alın'
        : 'Send /start to the Telegram bot to get a link code',
    discordHint:
      language === 'tr'
        ? 'Discord hesabınızı bağlayarak bildirim alın'
        : 'Connect your Discord account to receive notifications',
    connectedAt: language === 'tr' ? 'Bağlanma tarihi' : 'Connected at',
    notifications: language === 'tr' ? 'Bildirimler' : 'Notifications',
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
    setConnectionError('')
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: telegramCode.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        setConnectionError(data.error || 'Bağlantı başarısız')
      } else {
        setTelegramCode('')
        window.location.reload()
      }
    } catch {
      setConnectionError('Bağlantı sırasında hata oluştu')
    } finally {
      setTelegramLinking(false)
    }
  }

  const handleTelegramUnlink = async () => {
    setTelegramUnlinking(true)
    setConnectionError('')
    try {
      const res = await fetch('/api/telegram/link', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      }
    } catch {
      setConnectionError('Bağlantı kaldırılamadı')
    } finally {
      setTelegramUnlinking(false)
    }
  }

  const handleDiscordLink = async () => {
    setDiscordLinking(true)
    setConnectionError('')
    try {
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
      const redirectUri = `${window.location.origin}/api/discord/callback`
      const scope = 'identify'
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`
      window.location.href = discordAuthUrl
    } catch {
      setConnectionError('Discord bağlantısı başlatılamadı')
      setDiscordLinking(false)
    }
  }

  const handleDiscordUnlink = async () => {
    setDiscordUnlinking(true)
    setConnectionError('')
    try {
      const res = await fetch('/api/discord/link', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      }
    } catch {
      setConnectionError('Bağlantı kaldırılamadı')
    } finally {
      setDiscordUnlinking(false)
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
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#00E07A] to-[#22D3EE] bg-clip-text text-transparent">
            {labels.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {labels.subtitle}
          </p>
        </div>

        {/* User Avatar & Info */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00E07A] to-[#22D3EE] flex items-center justify-center text-white text-xl font-bold shrink-0">
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
            <User className="w-4 h-4 text-[#00E07A]" />
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-[#00E07A] transition-colors text-sm"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-[#00E07A] transition-colors text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #00E07A, #22D3EE)',
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
            <Shield className="w-4 h-4 text-[#22D3EE]" />
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

        {/* Connections */}
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Link className="w-4 h-4 text-[#10B981]" />
            <h3 className="font-semibold text-sm">{labels.connections}</h3>
          </div>

          {connectionError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {connectionError}
            </div>
          )}

          <div className="space-y-4">
            {/* Telegram Connection */}
            <div className="p-3 rounded-lg border border-border/30 bg-background/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#0088cc]" />
                  <span className="text-sm font-medium">{labels.telegram}</span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile?.telegramChatId
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {profile?.telegramChatId
                    ? labels.connected
                    : labels.notConnected}
                </div>
              </div>

              {profile?.telegramChatId ? (
                <div className="space-y-2">
                  {profile.telegramUsername && (
                    <p className="text-xs text-muted-foreground">
                      @{profile.telegramUsername}
                    </p>
                  )}
                  {profile.telegramConnectedAt && (
                    <p className="text-xs text-muted-foreground">
                      {labels.connectedAt}:{' '}
                      {new Date(
                        profile.telegramConnectedAt
                      ).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {labels.notifications}:{' '}
                      {profile.telegramNotifications ? 'ON' : 'OFF'}
                    </span>
                    <button
                      onClick={handleTelegramUnlink}
                      disabled={telegramUnlinking}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {telegramUnlinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3" />
                      )}
                      {labels.disconnect}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {labels.telegramHint}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={telegramCode}
                      onChange={(e) => setTelegramCode(e.target.value)}
                      placeholder={labels.telegramCodePlaceholder}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-[#0088cc] transition-colors text-xs"
                    />
                    <button
                      onClick={handleTelegramLink}
                      disabled={telegramLinking || !telegramCode.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: '#0088cc' }}
                    >
                      {telegramLinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Link className="w-3 h-3" />
                      )}
                      {labels.connect}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Discord Connection */}
            <div className="p-3 rounded-lg border border-border/30 bg-background/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#5865F2]" />
                  <span className="text-sm font-medium">{labels.discord}</span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile?.discordUserId
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {profile?.discordUserId
                    ? labels.connected
                    : labels.notConnected}
                </div>
              </div>

              {profile?.discordUserId ? (
                <div className="space-y-2">
                  {profile.discordUsername && (
                    <p className="text-xs text-muted-foreground">
                      {profile.discordUsername}
                    </p>
                  )}
                  {profile.discordConnectedAt && (
                    <p className="text-xs text-muted-foreground">
                      {labels.connectedAt}:{' '}
                      {new Date(
                        profile.discordConnectedAt
                      ).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {labels.notifications}:{' '}
                      {profile.discordNotifications ? 'ON' : 'OFF'}
                    </span>
                    <button
                      onClick={handleDiscordUnlink}
                      disabled={discordUnlinking}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {discordUnlinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3" />
                      )}
                      {labels.disconnect}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {labels.discordHint}
                  </p>
                  <button
                    onClick={handleDiscordLink}
                    disabled={discordLinking}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                    style={{ background: '#5865F2' }}
                  >
                    {discordLinking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Link className="w-3 h-3" />
                    )}
                    {labels.connect}
                  </button>
                </div>
              )}
            </div>
          </div>
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
