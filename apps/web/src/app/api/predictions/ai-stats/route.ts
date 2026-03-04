import { NextResponse } from 'next/server'
import { getAIAccuracyStats } from '@/lib/db-service'

export async function GET() {
  try {
    const result = await getAIAccuracyStats()
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 500 }
    )
  }
}
