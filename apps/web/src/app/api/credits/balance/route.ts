import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { getBalance } from '@/lib/credits'

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
  const balance = await getBalance(decoded.userId)
  return NextResponse.json({ balance })
}
