import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * Admin league activity control — proxied to match-service (which owns the DB
 * connection), NOT web-direct Prisma. The auth-token cookie is forwarded as a
 * Bearer token; match-service's adminMiddleware enforces the admin check.
 *
 * GET   /api/admin/leagues            → list all competitions (incl. passive)
 * PATCH /api/admin/leagues {id,active} → toggle a competition's activity
 */
function bearer(request: NextRequest): string | null {
  return (
    request.cookies.get('auth-token')?.value ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
    null
  )
}

export async function GET(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'gateway_not_configured' },
      { status: 503 }
    )
  }
  const token = bearer(request)
  try {
    const res = await fetch(`${GATEWAY_URL}/api/leagues/admin/all`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'gateway_unavailable' },
      { status: 502 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { success: false, error: 'gateway_not_configured' },
      { status: 503 }
    )
  }
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.id !== 'number' ||
    typeof body.active !== 'boolean'
  ) {
    return NextResponse.json(
      { success: false, error: 'invalid_body' },
      { status: 400 }
    )
  }
  const token = bearer(request)
  try {
    const res = await fetch(`${GATEWAY_URL}/api/leagues/admin/${body.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ active: body.active }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { success: false, error: 'gateway_unavailable' },
      { status: 502 }
    )
  }
}
