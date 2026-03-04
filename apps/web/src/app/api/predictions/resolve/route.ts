import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { resolvePredictions } from '@/lib/db-service'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded?.isAdmin) {
      // Also allow cron/system calls via API key
      const apiKey = request.headers.get('x-api-key')
      if (apiKey !== process.env.CRON_SECRET && !decoded) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    const result = await resolvePredictions()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Resolve predictions error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve predictions' },
      { status: 500 }
    )
  }
}
