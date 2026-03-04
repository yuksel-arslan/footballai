import { NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import {
  AI_MODELS,
  getAISettings,
  getSelectedModel,
  getAvailableModels,
} from '@/lib/ai-config'

export async function GET() {
  try {
    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/predictions/model/info`, {
          signal: AbortSignal.timeout(5000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to local info
      }
    }

    // Direct fallback: return local AI model info
    const settings = getAISettings()
    const selectedModel = getSelectedModel()
    const availableModels = getAvailableModels()

    return NextResponse.json({
      success: true,
      model: {
        name: selectedModel.name,
        id: selectedModel.id,
        provider: selectedModel.provider,
        quality: selectedModel.quality,
        speed: selectedModel.speed,
      },
      settings: {
        enablePredictions: settings.enablePredictions,
        cacheEnabled: settings.cacheEnabled,
        cacheDurationMinutes: settings.cacheDurationMinutes,
      },
      availableModels: availableModels.length,
      totalModels: AI_MODELS.length,
      source: 'direct-config',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Model info unavailable' },
      { status: 502 }
    )
  }
}
