import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'
import { sendDiscordDM, formatWelcome } from '@/lib/discord'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  return payload?.userId || null
}

// POST: Link Discord account using OAuth callback data
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Giriş yapmanız gerekli' },
        { status: 401 }
      )
    }

    const { discordUserId, discordUsername } = await request.json()
    if (!discordUserId) {
      return NextResponse.json(
        { success: false, error: 'Discord kullanıcı ID gerekli' },
        { status: 400 }
      )
    }

    // Check if this Discord account is already linked to another user
    const existingUser = await prisma.user.findUnique({
      where: { discordUserId },
    })
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu Discord hesabı başka bir kullanıcıya bağlı.',
        },
        { status: 409 }
      )
    }

    // Link the Discord account
    await prisma.user.update({
      where: { id: userId },
      data: {
        discordUserId,
        discordUsername: discordUsername || null,
        discordNotifications: true,
        discordConnectedAt: new Date(),
      },
    })

    // Notify user on Discord
    await sendDiscordDM(discordUserId, formatWelcome())

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discord Link]', error)
    return NextResponse.json(
      { success: false, error: 'Bağlantı sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

// DELETE: Unlink Discord account
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
      select: { discordUserId: true },
    })

    if (user?.discordUserId) {
      await sendDiscordDM(
        user.discordUserId,
        '🔓 Discord hesabınız FootballAI hesabından ayrıldı. Artık bildirim almayacaksınız.'
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        discordUserId: null,
        discordUsername: null,
        discordNotifications: false,
        discordConnectedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discord Unlink]', error)
    return NextResponse.json(
      { success: false, error: 'Bağlantı kaldırma sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

// GET: Check Discord link status
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
        discordUserId: true,
        discordUsername: true,
        discordNotifications: true,
        discordConnectedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      linked: !!user?.discordUserId,
      username: user?.discordUsername,
      notifications: user?.discordNotifications || false,
      connectedAt: user?.discordConnectedAt,
    })
  } catch (error) {
    console.error('[Discord Status]', error)
    return NextResponse.json(
      { success: false, error: 'Durum sorgulanamadı' },
      { status: 500 }
    )
  }
}
