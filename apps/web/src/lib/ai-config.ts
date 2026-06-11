// AI Model Configuration — multi-provider (Gemini + Anthropic Claude).
// Pricing is in credits per prediction; deducted server-side at /api/predict.

export type AIProvider = 'gemini' | 'anthropic'

/**
 * Task types the platform sends to an LLM. Each task auto-selects the most
 * suitable configured model (overridable per task via env):
 *  - research:   web scraping / news distillation — fast & cheap
 *  - analysis:   in-depth match analysis text — strongest reasoning
 *  - prediction: structured match outcome prediction — accuracy first
 */
export type AITask = 'research' | 'analysis' | 'prediction'

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
    creditCost: 4,
    speed: 'fast',
    quality: 'medium',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    description: 'Hızlı ve ekonomik model',
    creditCost: 4,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Hızlı ve akıllı - dengeli performans',
    creditCost: 4,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'En güçlü Gemini modeli - derin analiz için ideal',
    creditCost: 4,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Hızlı ve ekonomik Claude modeli',
    creditCost: 4,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    description: 'Hız ve zeka dengesi - güçlü analiz',
    creditCost: 4,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'anthropic',
    description: 'En güçlü Claude modeli - en isabetli analiz ve tahmin',
    creditCost: 4,
    speed: 'slow',
    quality: 'high',
  },
]

/**
 * Sentinel model id: the server picks the best configured model for the task
 * (prediction) via resolveModelForTask.
 */
export const AUTO_MODEL_ID = 'auto'

/** Credits charged for ML (Poisson + XGBoost) prediction — no AI cost. */
export const ML_PREDICTION_COST = 4

export function isProviderConfigured(provider: AIProvider): boolean {
  if (provider === 'gemini') {
    return !!(
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    )
  }
  return !!process.env.ANTHROPIC_API_KEY
}

/** Models whose provider has an API key configured (server-side). */
export function configuredModels(): AIModel[] {
  return AI_MODELS.filter((m) => isProviderConfigured(m.provider))
}

// Per-task model preference, best first. Auto-selection walks the list and
// picks the first model whose provider key is configured, so the platform
// degrades gracefully when only one provider is set up.
const TASK_MODEL_PRIORITY: Record<AITask, string[]> = {
  // Distilling scraped news/web content: cheap + fast wins
  research: ['gemini-2.5-flash', 'claude-haiku-4-5', 'gemini-2.0-flash'],
  // Long-form match analysis: strongest reasoning available
  analysis: ['claude-opus-4-8', 'gemini-2.5-pro', 'claude-sonnet-4-6'],
  // Structured outcome prediction: accuracy first, then balanced fallbacks
  prediction: ['claude-opus-4-8', 'gemini-2.5-flash', 'claude-sonnet-4-6'],
}

// Env overrides, e.g. AI_MODEL_PREDICTION=claude-sonnet-4-6
function taskOverride(task: AITask): string | undefined {
  switch (task) {
    case 'research':
      return process.env.AI_MODEL_RESEARCH
    case 'analysis':
      return process.env.AI_MODEL_ANALYSIS
    case 'prediction':
      return process.env.AI_MODEL_PREDICTION
  }
}

/**
 * Pick the most suitable configured model for a task. Order:
 *   1. AI_MODEL_<TASK> env override (if that provider is configured)
 *   2. Task priority list filtered by configured providers
 *   3. Any configured model
 * Returns null when no provider key is configured at all.
 * `excludeProvider` skips a provider — used for cross-provider fallback
 * after a failed call.
 */
export function resolveModelForTask(
  task: AITask,
  excludeProvider?: AIProvider
): AIModel | null {
  const usable = (m: AIModel | null): m is AIModel =>
    !!m && m.provider !== excludeProvider && isProviderConfigured(m.provider)

  const override = taskOverride(task)
  if (override) {
    const m = findModel(override)
    if (usable(m)) return m
  }

  for (const id of TASK_MODEL_PRIORITY[task]) {
    const m = findModel(id)
    if (usable(m)) return m
  }

  return configuredModels().find((m) => m.provider !== excludeProvider) ?? null
}

export interface AISettings {
  selectedModel: string
  enablePredictions: boolean
  cacheEnabled: boolean
  cacheDurationMinutes: number
  maxRequestsPerMinute: number
}

const DEFAULT_SETTINGS: AISettings = {
  selectedModel: AUTO_MODEL_ID,
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

// Get the currently selected model configuration.
// 'auto' resolves to the best configured model for the prediction task.
export function getSelectedModel(): AIModel {
  const settings = getAISettings()
  if (settings.selectedModel === AUTO_MODEL_ID) {
    return resolveModelForTask('prediction') || AI_MODELS[2] // gemini-2.5-flash
  }
  return AI_MODELS.find((m) => m.id === settings.selectedModel) || AI_MODELS[0]
}

/** Look up a model by id, returning null if unknown. */
export function findModel(modelId: string): AIModel | null {
  return AI_MODELS.find((m) => m.id === modelId) || null
}

export function isGeminiConfigured(): boolean {
  return isProviderConfigured('gemini')
}

export function isAnthropicConfigured(): boolean {
  return isProviderConfigured('anthropic')
}
