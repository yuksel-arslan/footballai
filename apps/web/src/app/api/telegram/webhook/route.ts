import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendTelegramMessage, formatWelcome } from '@/lib/telegram'
import crypto from 'crypto'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// In-memory store for pending link codes (chatId -> { code, username, createdAt })
const pendingLinks = new Map<
  string,
  { code: string; username?: string; createdAt: number }
>()

// Clean expired codes (older than 10 minutes)
function cleanExpiredCodes() {
  const now = Date.now()
  for (const [chatId, data] of pendingLinks) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingLinks.delete(chatId)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const headerSecret = request.headers.get(
        'x-telegram-bot-api-secret-token'
      )
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ ok: false }, { status: 403 })
      }
    }

    const update = await request.json()
    const message = update.message

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true })
    }

    const chatId = String(message.chat.id)
    const text = message.text.trim()

    // Handle /start command
    if (text === '/start') {
      cleanExpiredCodes()
      const code = crypto.randomBytes(3).toString('hex').toUpperCase()
      const username = message.from?.username || undefined
      pendingLinks.set(chatId, { code, username, createdAt: Date.now() })

      await sendTelegramMessage(chatId, formatWelcome(code))
      return NextResponse.json({ ok: true })
    }

    // Handle /link <code> command - link by providing a code from the web UI
    if (text.startsWith('/link')) {
      const parts = text.split(' ')
      if (parts.length < 2) {
        await sendTelegramMessage(
          chatId,
          '❌ Kullanım: /link <kod>\n\nProfilinizdeki bağlantı kodunu girin.'
        )
        return NextResponse.json({ ok: true })
      }

      // The code here comes from the web UI (user generates a code in settings)
      // For now, send instructions
      await sendTelegramMessage(
        chatId,
        '📱 FootballAI profil ayarlarından Telegram bağlantı kodunu alıp buraya yapıştırın.'
      )
      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (text === '/status') {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
        select: { email: true, fullName: true, telegramNotifications: true },
      })

      if (user) {
        await sendTelegramMessage(
          chatId,
          [
            `✅ <b>Hesap bağlı!</b>`,
            ``,
            `👤 ${user.fullName || user.email}`,
            `🔔 Bildirimler: ${user.telegramNotifications ? 'Açık' : 'Kapalı'}`,
          ].join('\n')
        )
      } else {
        await sendTelegramMessage(
          chatId,
          '❌ Telegram hesabınız henüz bir FootballAI hesabına bağlı değil.\n\n/start komutu ile başlayın.'
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Handle /stop command - disable notifications
    if (text === '/stop') {
      await prisma.user.updateMany({
        where: { telegramChatId: chatId },
        data: { telegramNotifications: false },
      })
      await sendTelegramMessage(chatId, '🔕 Telegram bildirimleri kapatıldı.')
      return NextResponse.json({ ok: true })
    }

    // Handle /resume command - enable notifications
    if (text === '/resume') {
      await prisma.user.updateMany({
        where: { telegramChatId: chatId },
        data: { telegramNotifications: true },
      })
      await sendTelegramMessage(chatId, '🔔 Telegram bildirimleri açıldı.')
      return NextResponse.json({ ok: true })
    }

    // Handle /help
    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        [
          `🤖 <b>FootballAI Bot Komutları</b>`,
          ``,
          `/start - Hesap bağlama kodunu al`,
          `/status - Hesap durumunu kontrol et`,
          `/stop - Bildirimleri kapat`,
          `/resume - Bildirimleri aç`,
          `/help - Bu yardım mesajı`,
        ].join('\n')
      )
      return NextResponse.json({ ok: true })
    }

    // Unknown command - check if it's a link code
    if (/^[A-Z0-9]{6}$/.test(text)) {
      await sendTelegramMessage(
        chatId,
        '💡 Bu kodu FootballAI profil ayarlarınızdaki Telegram bölümüne girin, burada değil.\n\nYardım için /help yazın.'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook]', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// Export pending links for use by the link API
export function getPendingLink(
  chatId: string
): { code: string; createdAt: number } | undefined {
  cleanExpiredCodes()
  return pendingLinks.get(chatId)
}

export function findChatIdByCode(
  code: string
): { chatId: string; username?: string } | null {
  cleanExpiredCodes()
  for (const [chatId, data] of pendingLinks) {
    if (data.code === code.toUpperCase()) {
      return { chatId, username: data.username }
    }
  }
  return null
}

export function removePendingLink(chatId: string) {
  pendingLinks.delete(chatId)
}
