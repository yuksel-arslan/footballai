// AI Model Configuration
// Admin can select which AI model to use for predictions

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'local'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  description: string
  costPerRequest?: string
  speed: 'fast' | 'medium' | 'slow'
  quality: 'high' | 'medium' | 'low'
}

export const AI_MODELS: AIModel[] = [
  // Google Gemini Models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'En güçlü Gemini modeli - derin analiz için ideal',
    costPerRequest: 'Orta',
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Hızlı ve akıllı - dengeli performans',
    costPerRequest: 'Düşük',
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Hızlı ve ekonomik model',
    costPerRequest: 'Düşük',
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    description: 'Ultra hızlı ve ekonomik',
    costPerRequest: 'Çok Düşük',
    speed: 'fast',
    quality: 'medium',
  },
  // OpenAI Models
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Hızlı ve ekonomik OpenAI modeli',
    costPerRequest: 'Düşük',
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'En güçlü OpenAI modeli',
    costPerRequest: 'Yüksek',
    speed: 'medium',
    quality: 'high',
  },
  // Anthropic Models
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Hızlı ve akıllı Anthropic modeli',
    costPerRequest: 'Düşük',
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Dengeli performans ve kalite',
    costPerRequest: 'Orta',
    speed: 'medium',
    quality: 'high',
  },
  // Local/Fallback
  {
    id: 'random',
    name: 'Rastgele (Mock)',
    provider: 'local',
    description: 'Test için rastgele tahminler - API key gerektirmez',
    costPerRequest: 'Ücretsiz',
    speed: 'fast',
    quality: 'low',
  },
]

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
  return AI_MODELS.find(m => m.id === settings.selectedModel) || AI_MODELS[0]
}

// Check if a specific provider is configured
export function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case 'gemini':
      return !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)
    case 'openai':
      return !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)
    case 'anthropic':
      return !!(process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY)
    case 'local':
      return true
    default:
      return false
  }
}

// Get available models (only those with configured API keys)
export function getAvailableModels(): AIModel[] {
  return AI_MODELS.filter(model => isProviderConfigured(model.provider))
}
