import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { addFavoriteLeague, removeFavoriteLeague } from '@/lib/db-service'

// `id` is the league's provider apiId (same id space the rest of the UI uses).

function getAuthUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const decoded = verifyToken(token)
  return decoded?.userId || null
}

async function handle(
  request: NextRequest,
  params: Promise<{ id: string }>,
  action: 'add' | 'remove'
) {
  const userId = getAuthUserId(request)
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }
  const { id } = await params
  const apiId = Number(id)
  if (!Number.isFinite(apiId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid league id' },
      { status: 400 }
    )
  }
  try {
    const res =
      action === 'add'
        ? await addFavoriteLeague(userId, apiId)
        : await removeFavoriteLeague(userId, apiId)
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Favorite league mutate error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(request, params, 'add')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(request, params, 'remove')
}
