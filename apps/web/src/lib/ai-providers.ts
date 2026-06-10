/**
 * Provider-agnostic text generation. Single entry point (generateText) that
 * dispatches to the model's provider — Gemini via @google/generative-ai,
 * Claude via @anthropic-ai/sdk. Callers pick a model with
 * resolveModelForTask() / findModel() from ai-config and never talk to a
 * provider SDK directly, so adding a provider only touches this file.
 *
 * SDKs are lazy-loaded so a missing package fails the call, not the build.
 */

import type { AIModel } from './ai-config'

export interface GenerateTextOptions {
  /** Hard output cap. Defaults sized for short structured responses. */
  maxTokens?: number
}

// Adaptive thinking is supported (and worth the tokens) on these Claude
// models; Haiku does not support it.
const CLAUDE_ADAPTIVE_THINKING = new Set([
  'claude-opus-4-8',
  'claude-sonnet-4-6',
])

async function generateGeminiText(
  model: AIModel,
  prompt: string
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured (server env)')

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({ model: model.id })

  const result = await genModel.generateContent(prompt)
  const response = await result.response
  return response.text()
}

async function generateAnthropicText(
  model: AIModel,
  prompt: string,
  options: GenerateTextOptions
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Anthropic API key not configured (server env)')

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  // Adaptive thinking tokens count toward max_tokens — leave headroom
  const response = await client.messages.create({
    model: model.id,
    max_tokens: options.maxTokens ?? 16000,
    ...(CLAUDE_ADAPTIVE_THINKING.has(model.id)
      ? { thinking: { type: 'adaptive' as const } }
      : {}),
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('')
}

/** Generate text with the given model, regardless of provider. Throws on failure. */
export async function generateText(
  model: AIModel,
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  if (model.provider === 'anthropic') {
    return generateAnthropicText(model, prompt, options)
  }
  return generateGeminiText(model, prompt)
}
