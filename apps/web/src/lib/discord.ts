import { PrismaClient } from '@prisma/client'

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || ''
const DISCORD_API = 'https://discord.com/api/v10'

const globalForPrisma = globalThis as unknown as {
  discordPrisma: PrismaClient | undefined
}
const prisma =
  globalForPrisma.discordPrisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production')
  globalForPrisma.discordPrisma = prisma

export function isDiscordConfigured(): boolean {
  return !!BOT_TOKEN
}

export async function sendDiscordDM(
  userId: string,
  content: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false

  try {
    // Create DM channel
    const channelRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ recipient_id: userId }),
    })
    if (!channelRes.ok) return false

    const channel = await channelRes.json()

    // Send message
    const msgRes = await fetch(
      `${DISCORD_API}/channels/${channel.id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify({ content }),
      }
    )
    return msgRes.ok
  } catch (error) {
    console.error('[Discord] Send DM failed:', error)
    return false
  }
}

// Format match notification for Discord
export function formatMatchStart(
  homeTeam: string,
  awayTeam: string,
  league: string
): string {
  return [
    `⚽ **Maç Başladı!**`,
    ``,
    `🏟 **${homeTeam}** vs **${awayTeam}**`,
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
    `🏁 **Maç Bitti!**`,
    ``,
    `**${homeTeam}** ${homeScore} - ${awayScore} **${awayTeam}**`,
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
    `🎯 **AI Tahmin**`,
    ``,
    `🏟 **${homeTeam}** vs **${awayTeam}**`,
    ``,
    `📊 ${homeTeam}: %${(homeWinProb * 100).toFixed(0)}`,
    `🤝 Beraberlik: %${(drawProb * 100).toFixed(0)}`,
    `📊 ${awayTeam}: %${(awayWinProb * 100).toFixed(0)}`,
    ``,
    `🔮 Güven: %${(confidence * 100).toFixed(0)}`,
    `💡 ${analysis}`,
  ].join('\n')
}

export function formatWelcome(): string {
  return [
    `👋 **FootballAI Discord Bot'a hoş geldiniz!**`,
    ``,
    `Hesabınız başarıyla bağlandı!`,
    `Artık maç bildirimlerini Discord üzerinden alacaksınız.`,
  ].join('\n')
}

// Send prediction notification to all Discord-connected users
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
  if (!isDiscordConfigured()) return

  try {
    const users = await prisma.user.findMany({
      where: {
        discordUserId: { not: null },
        discordNotifications: true,
      },
      select: { discordUserId: true },
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
      users.map((user) => sendDiscordDM(user.discordUserId!, message))
    )
  } catch (error) {
    console.error('[Discord] Prediction notification failed:', error)
  }
}
