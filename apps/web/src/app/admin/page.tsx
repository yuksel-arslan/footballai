'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  Cpu,
  Zap,
  Shield,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Lock,
  Loader2,
  Coins,
  Plus,
  User as UserIcon,
} from 'lucide-react'
import {
  AI_MODELS,
  type AISettings,
  getAISettings,
  saveAISettings,
} from '@/lib/ai-config'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useCredits, useInvalidateCredits } from '@/hooks/use-credits'
import Link from 'next/link'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAdmin, isAuthenticated } = useAuth()
  const [settings, setSettings] = useState<AISettings>(getAISettings())
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const { language } = useI18n()

  // Credit grant panel state
  const { data: ownBalance } = useCredits()
  const invalidateCredits = useInvalidateCredits()
  const [grantUserId, setGrantUserId] = useState<string>('')
  const [grantAmount, setGrantAmount] = useState<string>('100')
  const [grantNote, setGrantNote] = useState<string>('')
  const [granting, setGranting] = useState(false)
  const [grantResult, setGrantResult] = useState<
    | null
    | { kind: 'success'; balance: number; email: string | null; delta: number }
    | { kind: 'error'; message: string }
  >(null)

  // Default to current admin's own id once auth has loaded.
  useEffect(() => {
    if (user?.id && !grantUserId) setGrantUserId(user.id)
  }, [user?.id, grantUserId])

  const handleGrant = async () => {
    setGrantResult(null)
    const amount = parseInt(grantAmount, 10)
    if (!grantUserId || !Number.isInteger(amount) || amount === 0) {
      setGrantResult({
        kind: 'error',
        message:
          language === 'tr'
            ? 'Geçerli bir userId ve sıfır olmayan tam sayı amount girin.'
            : 'Provide a valid userId and a non-zero integer amount.',
      })
      return
    }
    setGranting(true)
    try {
      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: grantUserId,
          amount,
          note: grantNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGrantResult({
          kind: 'error',
          message: data.error || `HTTP ${res.status}`,
        })
        return
      }
      setGrantResult({
        kind: 'success',
        balance: data.balance,
        email: data.email,
        delta: data.delta,
      })
      // If we just topped up our own account, refresh the header pill.
      if (grantUserId === user?.id) invalidateCredits()
    } catch (e) {
      setGrantResult({
        kind: 'error',
        message: e instanceof Error ? e.message : 'network_error',
      })
    } finally {
      setGranting(false)
    }
  }

  // Labels
  const labels = {
    title: language === 'tr' ? 'Admin Ayarları' : 'Admin Settings',
    subtitle:
      language === 'tr'
        ? 'AI model ve tahmin ayarlarını yönetin'
        : 'Manage AI model and prediction settings',
    aiModel: language === 'tr' ? 'AI Model Seçimi' : 'AI Model Selection',
    selectModel: language === 'tr' ? 'Model seçin' : 'Select model',
    enablePredictions:
      language === 'tr' ? 'Tahminleri Etkinleştir' : 'Enable Predictions',
    enableCache: language === 'tr' ? 'Önbellek Etkinleştir' : 'Enable Cache',
    cacheDuration:
      language === 'tr' ? 'Önbellek Süresi (dk)' : 'Cache Duration (min)',
    rateLimit: language === 'tr' ? 'Dakikadaki Max İstek' : 'Max Requests/Min',
    save: language === 'tr' ? 'Kaydet' : 'Save',
    saved: language === 'tr' ? 'Kaydedildi!' : 'Saved!',
    testModel: language === 'tr' ? 'Model Test Et' : 'Test Model',
    testing: language === 'tr' ? 'Test ediliyor...' : 'Testing...',
    apiStatus: language === 'tr' ? 'API Durumu' : 'API Status',
    configured: language === 'tr' ? 'Yapılandırıldı' : 'Configured',
    notConfigured: language === 'tr' ? 'Yapılandırılmadı' : 'Not Configured',
    availableModels:
      language === 'tr' ? 'Kullanılabilir Modeller' : 'Available Models',
    speed: language === 'tr' ? 'Hız' : 'Speed',
    quality: language === 'tr' ? 'Kalite' : 'Quality',
    cost: language === 'tr' ? 'Maliyet' : 'Cost',
    fast: language === 'tr' ? 'Hızlı' : 'Fast',
    medium: language === 'tr' ? 'Orta' : 'Medium',
    slow: language === 'tr' ? 'Yavaş' : 'Slow',
    high: language === 'tr' ? 'Yüksek' : 'High',
    low: language === 'tr' ? 'Düşük' : 'Low',
  }

  useEffect(() => {
    fetchApiStatus()
  }, [])

  const fetchApiStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/predict')
      const data = await res.json()
      setApiStatus(data)
    } catch (error) {
      console.error('Failed to fetch API status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    setSaving(true)
    saveAISettings(settings)
    setTimeout(() => setSaving(false), 1000)
  }

  const handleTestModel = async () => {
    setTestResult(null)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match: {
            homeTeam: 'Manchester United',
            awayTeam: 'Liverpool',
            league: 'Premier League',
          },
        }),
      })
      const data = await res.json()
      if (data.prediction) {
        setTestResult(
          `✅ ${data.prediction.model}: ${data.prediction.analysis}`
        )
      } else {
        setTestResult('❌ Tahmin üretilemedi')
      }
    } catch {
      setTestResult('❌ Test başarısız')
    }
  }

  const getSpeedLabel = (speed: string) => {
    if (speed === 'fast') return labels.fast
    if (speed === 'medium') return labels.medium
    return labels.slow
  }

  const getQualityLabel = (quality: string) => {
    if (quality === 'high') return labels.high
    if (quality === 'medium') return labels.medium
    return labels.low
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    )
  }

  // Show access denied if authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neon-card rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Erişim Engellendi</h1>
          <p className="text-muted-foreground mb-6">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece yöneticiler bu
            sayfayı görüntüleyebilir.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="w-full px-4 pb-12">
        {/* Header */}
        <div className="py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1]">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] bg-clip-text text-transparent">
              {labels.title}
            </h1>
          </div>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Model Selection */}
          <div className="neon-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-[#8B5CF6]" />
              <h2 className="text-lg font-semibold">{labels.aiModel}</h2>
            </div>

            {/* Model Dropdown */}
            <div className="relative">
              <select
                value={settings.selectedModel}
                onChange={(e) =>
                  setSettings({ ...settings, selectedModel: e.target.value })
                }
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-border bg-card text-foreground cursor-pointer focus:outline-none focus:border-[#8B5CF6] transition-colors"
              >
                <optgroup label="Google Gemini">
                  {AI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.creditCost}cr) - {model.description}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Selected Model Info */}
            {(() => {
              const selectedModel = AI_MODELS.find(
                (m) => m.id === settings.selectedModel
              )
              if (!selectedModel) return null
              const isAvailable = apiStatus?.geminiConfigured
              return (
                <div className="mt-4 p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{selectedModel.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        isAvailable
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {selectedModel.provider.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        selectedModel.speed === 'fast'
                          ? 'bg-green-500/20 text-green-500'
                          : selectedModel.speed === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {getSpeedLabel(selectedModel.speed)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        selectedModel.quality === 'high'
                          ? 'bg-blue-500/20 text-blue-500'
                          : selectedModel.quality === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {getQualityLabel(selectedModel.quality)}
                    </span>
                    <span className="text-muted-foreground">
                      {labels.cost}: {selectedModel.creditCost} cr
                    </span>
                  </div>
                  {!isAvailable && (
                    <p className="mt-2 text-xs text-red-500">
                      ⚠️ API key yapılandırılmamış
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Test Button */}
            <button
              onClick={handleTestModel}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {labels.testModel}
            </button>

            {testResult && (
              <div className="mt-3 p-3 rounded-lg bg-card text-sm">
                {testResult}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-6">
            {/* API Status */}
            <div className="neon-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#10B981]" />
                <h2 className="text-lg font-semibold">{labels.apiStatus}</h2>
                <button
                  onClick={fetchApiStatus}
                  className="ml-auto p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    apiStatus?.geminiConfigured
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  {apiStatus?.geminiConfigured ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">Gemini</span>
                </div>
              </div>

              {apiStatus?.cacheSize !== undefined && (
                <p className="text-xs text-muted-foreground mt-3">
                  Cache: {apiStatus.cacheSize} items
                </p>
              )}
            </div>

            {/* Options */}
            <div className="neon-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Ayarlar</h2>

              <div className="space-y-4">
                {/* Enable Predictions */}
                <label className="flex items-center justify-between">
                  <span>{labels.enablePredictions}</span>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        enablePredictions: !settings.enablePredictions,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.enablePredictions ? 'bg-[#10B981]' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.enablePredictions
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                {/* Enable Cache */}
                <label className="flex items-center justify-between">
                  <span>{labels.enableCache}</span>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        cacheEnabled: !settings.cacheEnabled,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.cacheEnabled ? 'bg-[#10B981]' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.cacheEnabled
                          ? 'translate-x-6'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                {/* Cache Duration */}
                <div className="flex items-center justify-between">
                  <span>{labels.cacheDuration}</span>
                  <input
                    type="number"
                    value={settings.cacheDurationMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cacheDurationMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-20 px-3 py-1.5 rounded-lg border border-border bg-card text-center"
                    min={5}
                    max={120}
                  />
                </div>

                {/* Rate Limit */}
                <div className="flex items-center justify-between">
                  <span>{labels.rateLimit}</span>
                  <input
                    type="number"
                    value={settings.maxRequestsPerMinute}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxRequestsPerMinute: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-20 px-3 py-1.5 rounded-lg border border-border bg-card text-center"
                    min={10}
                    max={100}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all"
                style={{
                  background: saving
                    ? '#10B981'
                    : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                }}
              >
                {saving ? (
                  <>
                    <Check className="w-4 h-4" />
                    {labels.saved}
                  </>
                ) : (
                  labels.save
                )}
              </button>
            </div>
          </div>

          {/* Credit Grant Panel — admin-only, manual top-up */}
          <div className="neon-card rounded-2xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold">
                {language === 'tr' ? 'Kredi Yükleme' : 'Credit Grant'}
              </h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {language === 'tr' ? 'Mevcut bakiyem' : 'My balance'}:{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {ownBalance ?? 0} cr
                </span>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* User ID */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  User ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    placeholder="cuid…"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => user?.id && setGrantUserId(user.id)}
                    className="px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-xs flex items-center gap-1.5"
                    title={language === 'tr' ? 'Kendi ID' : 'My own ID'}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Ben' : 'Me'}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {language === 'tr' ? 'Miktar (kredi)' : 'Amount (credits)'}
                </label>
                <input
                  type="number"
                  step="1"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {language === 'tr'
                    ? 'Negatif girilirse kredi düşülür (revoke).'
                    : 'Negative values revoke credits.'}
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {language === 'tr' ? 'Not (opsiyonel)' : 'Note (optional)'}
                </label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder={
                    language === 'tr' ? 'Örn. test top-up' : 'e.g. test top-up'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                />
              </div>

              {/* Action + result */}
              <div className="sm:col-span-2 flex flex-col gap-3">
                <button
                  onClick={handleGrant}
                  disabled={granting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {granting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'tr' ? 'Yükleniyor…' : 'Granting…'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {language === 'tr' ? 'Kredi Yükle' : 'Grant Credits'}
                    </>
                  )}
                </button>

                {grantResult?.kind === 'success' && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div>
                        {grantResult.delta > 0 ? '+' : ''}
                        {grantResult.delta} cr →{' '}
                        <span className="font-semibold">
                          {grantResult.email || grantUserId}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {language === 'tr' ? 'Yeni bakiye' : 'New balance'}:{' '}
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {grantResult.balance} cr
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {grantResult?.kind === 'error' && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{grantResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
