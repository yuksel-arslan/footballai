import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { getFavoriteLeagues } from '@/lib/db-service'

function getAuthUserId(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const decoded = verifyToken(token)
  return decoded?.userId || null
}

export async function GET(request: NextRequest) {
  const userId = getAuthUserId(request)
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }
  try {
    const data = await getFavoriteLeagues(userId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Favorite leagues GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    )
  }
}
