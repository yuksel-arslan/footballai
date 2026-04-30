// AI Model Configuration — Gemini only.
// Pricing is in credits per prediction; deducted server-side at /api/predict.

export type AIProvider = 'gemini'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  description: string
  /** Credits charged per prediction request. */
  creditCost: number
  speed: 'fast' | 'medium' | 'slow'
  quality: 'high' | 'medium' | 'low'
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    description: 'Ultra hızlı ve ekonomik',
    creditCost: 1,
    speed: 'fast',
    quality: 'medium',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Hızlı ve ekonomik model',
    creditCost: 2,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Hızlı ve akıllı - dengeli performans',
    creditCost: 3,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'En güçlü Gemini modeli - derin analiz için ideal',
    creditCost: 9,
    speed: 'medium',
    quality: 'high',
  },
]

/** Credits charged for ML (Poisson + XGBoost) prediction — no AI cost. */
export const ML_PREDICTION_COST = 2

export interface AISettings {
  selectedModel: string
  enablePredictions: boolean
  cacheEnabled: boolean
  cacheDurationMinutes: number
  maxRequestsPerMinute: number
}

const DEFAULT_SETTINGS: AISettings = {
  selectedModel: 'gemini-2.5-flash',
  enablePredictions: true,
  cacheEnabled: true,
  cacheDurationMinutes: 30,
  maxRequestsPerMinute: 30,
}

// Get settings from localStorage (client-side) or env (server-side)
export function getAISettings(): AISettings {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ai-settings')
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
  }

  // Server-side: use env variable
  const envModel = process.env.AI_MODEL || process.env.NEXT_PUBLIC_AI_MODEL
  if (envModel) {
    return { ...DEFAULT_SETTINGS, selectedModel: envModel }
  }

  return DEFAULT_SETTINGS
}

// Save settings (client-side only)
export function saveAISettings(settings: Partial<AISettings>): void {
  if (typeof window !== 'undefined') {
    const current = getAISettings()
    const updated = { ...current, ...settings }
    localStorage.setItem('ai-settings', JSON.stringify(updated))
  }
}

// Get the currently selected model configuration
export function getSelectedModel(): AIModel {
  const settings = getAISettings()
  return AI_MODELS.find((m) => m.id === settings.selectedModel) || AI_MODELS[0]
}

/** Look up a model by id, returning null if unknown. */
export function findModel(modelId: string): AIModel | null {
  return AI_MODELS.find((m) => m.id === modelId) || null
}

export function isGeminiConfigured(): boolean {
  return !!(
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  )
}
