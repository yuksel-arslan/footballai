import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'

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

/** Host part of a connection string, credentials stripped. */
function hostOf(url?: string): string | null {
  if (!url) return null
  const m = url.match(/@([^/?]+)/)
  return m ? m[1] : 'unparseable'
}

/**
 * GET /api/admin/db-diag — which DB does the web app use, is it reachable,
 * and do the credit tables/columns exist? Admin only; no secrets returned.
 */
export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const decoded = token ? verifyToken(token) : null
  if (!decoded?.isAdmin) {
    return NextResponse.json({ error: 'admin_required' }, { status: 403 })
  }

  const source = process.env.APP_DATABASE_URL
    ? 'APP_DATABASE_URL'
    : 'DATABASE_URL'
  const host = hostOf(
    process.env.APP_DATABASE_URL || process.env.DATABASE_URL
  )

  let reachable = false
  let error: string | null = null
  let tables: Record<string, boolean> = {}
  let creditsColumn = false
  try {
    await prisma.$queryRaw`SELECT 1`
    reachable = true

    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users','credit_transactions','fixtures','leagues','teams')`
    const present = new Set(rows.map((r) => r.table_name))
    for (const t of [
      'users',
      'credit_transactions',
      'fixtures',
      'leagues',
      'teams',
    ]) {
      tables[t] = present.has(t)
    }

    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'credits'`
    creditsColumn = cols.length > 0
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 300) : String(e)
  }

  return NextResponse.json({
    source,
    host,
    reachable,
    tables,
    usersCreditsColumn: creditsColumn,
    error,
  })
}
