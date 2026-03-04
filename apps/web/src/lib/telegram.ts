import { PrismaClient } from '@prisma/client'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

const globalForPrisma = globalThis as unknown as {
  telegramPrisma: PrismaClient | undefined
}
const prisma = globalForPrisma.telegramPrisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production')
  globalForPrisma.telegramPrisma = prisma

export function isTelegramConfigured(): boolean {
  return !!BOT_TOKEN
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!BOT_TOKEN) return false

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    })
    return res.ok
  } catch (error) {
    console.error('[Telegram] Send message failed:', error)
    return false
  }
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!BOT_TOKEN) return false

  try {
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Format match notification for Telegram
export function formatMatchStart(
  homeTeam: string,
  awayTeam: string,
  league: string
): string {
  return [
    `⚽ <b>Maç Başladı!</b>`,
    ``,
    `🏟 <b>${homeTeam}</b> vs <b>${awayTeam}</b>`,
    `🏆 ${league}`,
  ].join('\n')
}

export function formatMatchResult(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  league: string
): string {
  return [
    `🏁 <b>Maç Bitti!</b>`,
    ``,
    `<b>${homeTeam}</b> ${homeScore} - ${awayScore} <b>${awayTeam}</b>`,
    `🏆 ${league}`,
  ].join('\n')
}

export function formatPrediction(
  homeTeam: string,
  awayTeam: string,
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number,
  confidence: number,
  analysis: string
): string {
  return [
    `🎯 <b>AI Tahmin</b>`,
    ``,
    `🏟 <b>${homeTeam}</b> vs <b>${awayTeam}</b>`,
    ``,
    `📊 ${homeTeam}: %${(homeWinProb * 100).toFixed(0)}`,
    `🤝 Beraberlik: %${(drawProb * 100).toFixed(0)}`,
    `📊 ${awayTeam}: %${(awayWinProb * 100).toFixed(0)}`,
    ``,
    `🔮 Güven: %${(confidence * 100).toFixed(0)}`,
    `💡 ${analysis}`,
  ].join('\n')
}

export function formatWelcome(linkCode: string): string {
  return [
    `👋 <b>FootballAI Telegram Bot'a hoş geldiniz!</b>`,
    ``,
    `Hesabınızı bağlamak için aşağıdaki kodu kullanın:`,
    ``,
    `🔑 <code>${linkCode}</code>`,
    ``,
    `Bu kodu FootballAI profil ayarlarınıza girin.`,
    `Veya /link komutu ile bağlayabilirsiniz.`,
  ].join('\n')
}

// Send prediction notification to all Telegram-connected users
export async function notifyPrediction(prediction: {
  homeTeam: string
  awayTeam: string
  league: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  confidence: number
  analysis: string
}): Promise<void> {
  if (!isTelegramConfigured()) return

  try {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        telegramNotifications: true,
      },
      select: { telegramChatId: true },
    })

    if (users.length === 0) return

    const message = formatPrediction(
      prediction.homeTeam,
      prediction.awayTeam,
      prediction.homeWinProb,
      prediction.drawProb,
      prediction.awayWinProb,
      prediction.confidence,
      prediction.analysis
    )

    await Promise.allSettled(
      users.map((user) => sendTelegramMessage(user.telegramChatId!, message))
    )
  } catch (error) {
    console.error('[Telegram] Prediction notification failed:', error)
  }
}
