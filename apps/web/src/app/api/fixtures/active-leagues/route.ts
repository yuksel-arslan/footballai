import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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

const normName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * GET /api/fixtures/active-leagues
 * The set of competitions currently in season (League.active is driven by the
 * provider season calendar). The matches list uses this to keep the spirit of
 * the day: during the World Cup, off-season domestic leagues are inactive and
 * dropped from the lists. Returns apiIds + normalized names; empty when the DB
 * is unavailable (callers then skip filtering — fail open).
 */
export async function GET() {
  try {
    const leagues = await prisma.league.findMany({
      where: { active: true },
      select: { apiId: true, name: true },
    })
    const apiIds = leagues
      .map((l) => l.apiId)
      .filter((n): n is number => n != null)
    const names = leagues.map((l) => normName(l.name))
    return NextResponse.json({ success: true, data: { apiIds, names } })
  } catch (error) {
    console.error('[Active Leagues]', error)
    return NextResponse.json({ success: true, data: { apiIds: [], names: [] } })
  }
}
