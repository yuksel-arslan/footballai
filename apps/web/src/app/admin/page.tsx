'use client'

import { useState, useEffect } from 'react'
import { Settings, Cpu, Zap, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { AI_MODELS, type AISettings, getAISettings, saveAISettings } from '@/lib/ai-config'
import { useI18n } from '@/lib/i18n'

export default function AdminPage() {
  const [settings, setSettings] = useState<AISettings>(getAISettings())
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const { language } = useI18n()

  // Labels
  const labels = {
    title: language === 'tr' ? 'Admin Ayarları' : 'Admin Settings',
    subtitle: language === 'tr' ? 'AI model ve tahmin ayarlarını yönetin' : 'Manage AI model and prediction settings',
    aiModel: language === 'tr' ? 'AI Model Seçimi' : 'AI Model Selection',
    selectModel: language === 'tr' ? 'Model seçin' : 'Select model',
    enablePredictions: language === 'tr' ? 'Tahminleri Etkinleştir' : 'Enable Predictions',
    enableCache: language === 'tr' ? 'Önbellek Etkinleştir' : 'Enable Cache',
    cacheDuration: language === 'tr' ? 'Önbellek Süresi (dk)' : 'Cache Duration (min)',
    rateLimit: language === 'tr' ? 'Dakikadaki Max İstek' : 'Max Requests/Min',
    save: language === 'tr' ? 'Kaydet' : 'Save',
    saved: language === 'tr' ? 'Kaydedildi!' : 'Saved!',
    testModel: language === 'tr' ? 'Model Test Et' : 'Test Model',
    testing: language === 'tr' ? 'Test ediliyor...' : 'Testing...',
    apiStatus: language === 'tr' ? 'API Durumu' : 'API Status',
    configured: language === 'tr' ? 'Yapılandırıldı' : 'Configured',
    notConfigured: language === 'tr' ? 'Yapılandırılmadı' : 'Not Configured',
    availableModels: language === 'tr' ? 'Kullanılabilir Modeller' : 'Available Models',
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
        setTestResult(`✅ ${data.prediction.model}: ${data.prediction.analysis}`)
      } else {
        setTestResult('❌ Tahmin üretilemedi')
      }
    } catch (error) {
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

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 pb-12">
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

            <div className="space-y-3">
              {AI_MODELS.map((model) => {
                const isAvailable = apiStatus?.providers?.[model.provider]
                const isSelected = settings.selectedModel === model.id

                return (
                  <button
                    key={model.id}
                    onClick={() => setSettings({ ...settings, selectedModel: model.id })}
                    disabled={!isAvailable && model.provider !== 'local'}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-[#8B5CF6]/20 border-2 border-[#8B5CF6]'
                        : 'bg-card border border-border hover:border-[#8B5CF6]/50'
                    } ${!isAvailable && model.provider !== 'local' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{model.name}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#8B5CF6]" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {model.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            model.speed === 'fast' ? 'bg-green-500/20 text-green-500' :
                            model.speed === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {getSpeedLabel(model.speed)}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${
                            model.quality === 'high' ? 'bg-blue-500/20 text-blue-500' :
                            model.quality === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {getQualityLabel(model.quality)}
                          </span>
                          {model.costPerRequest && (
                            <span className="text-muted-foreground">
                              {labels.cost}: {model.costPerRequest}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isAvailable || model.provider === 'local'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {model.provider.toUpperCase()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

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
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['gemini', 'openai', 'anthropic', 'local'].map((provider) => (
                  <div
                    key={provider}
                    className={`p-3 rounded-xl flex items-center gap-2 ${
                      apiStatus?.providers?.[provider]
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    {apiStatus?.providers?.[provider] ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium capitalize">{provider}</span>
                  </div>
                ))}
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
                    onClick={() => setSettings({ ...settings, enablePredictions: !settings.enablePredictions })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.enablePredictions ? 'bg-[#10B981]' : 'bg-muted'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.enablePredictions ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>

                {/* Enable Cache */}
                <label className="flex items-center justify-between">
                  <span>{labels.enableCache}</span>
                  <button
                    onClick={() => setSettings({ ...settings, cacheEnabled: !settings.cacheEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.cacheEnabled ? 'bg-[#10B981]' : 'bg-muted'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.cacheEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>

                {/* Cache Duration */}
                <div className="flex items-center justify-between">
                  <span>{labels.cacheDuration}</span>
                  <input
                    type="number"
                    value={settings.cacheDurationMinutes}
                    onChange={(e) => setSettings({ ...settings, cacheDurationMinutes: parseInt(e.target.value) || 30 })}
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
                    onChange={(e) => setSettings({ ...settings, maxRequestsPerMinute: parseInt(e.target.value) || 30 })}
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
                  background: saving ? '#10B981' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
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
        </div>
      </main>
    </div>
  )
}
