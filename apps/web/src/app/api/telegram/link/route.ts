import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'
import { sendTelegramMessage } from '@/lib/telegram'
import {
  findChatIdByCode,
  removePendingLink,
} from '@/app/api/telegram/webhook/route'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  return payload?.userId || null
}

// POST: Link Telegram account using code from bot
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekli' },
        { status: 401 }
      )
    }

    const { code } = await request.json()
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Bağlantı kodu gerekli' },
        { status: 400 }
      )
    }

    // Find the chat ID associated with this code
    const linkResult = findChatIdByCode(code)
    if (!linkResult) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Geçersiz veya süresi dolmuş kod. Telegram botunda /start yazarak yeni kod alın.',
        },
        { status: 400 }
      )
    }

    const { chatId, username } = linkResult

    // Check if this chatId is already linked to another user
    const existingUser = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true },
    })
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu Telegram hesabı başka bir kullanıcıya bağlı.',
        },
        { status: 409 }
      )
    }

    // Link the Telegram account
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: chatId,
        telegramUsername: username || null,
        telegramNotifications: true,
        telegramConnectedAt: new Date(),
      },
    })

    // Clean up the pending link
    removePendingLink(chatId)

    // Notify user on Telegram
    await sendTelegramMessage(
      chatId,
      '✅ Hesabınız başarıyla bağlandı! Artık maç bildirimlerini Telegram üzerinden alacaksınız.'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Telegram Link]', error)
    return NextResponse.json(
      { success: false, error: 'Bağlantı sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

// DELETE: Unlink Telegram account
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekli' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    })

    if (user?.telegramChatId) {
      await sendTelegramMessage(
        user.telegramChatId,
        '🔓 Telegram hesabınız FootballAI hesabından ayrıldı. Artık bildirim almayacaksınız.'
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramNotifications: false,
        telegramConnectedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Telegram Unlink]', error)
    return NextResponse.json(
      { success: false, error: 'Bağlantı kaldırma sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

// GET: Check Telegram link status
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekli' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        telegramUsername: true,
        telegramNotifications: true,
        telegramConnectedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      linked: !!user?.telegramChatId,
      username: user?.telegramUsername,
      notifications: user?.telegramNotifications || false,
      connectedAt: user?.telegramConnectedAt,
    })
  } catch (error) {
    console.error('[Telegram Status]', error)
    return NextResponse.json(
      { success: false, error: 'Durum sorgulanamadı' },
      { status: 500 }
    )
  }
}
