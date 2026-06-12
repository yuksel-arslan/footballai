import { prisma } from '@football-ai/database'
import { apiFootballClient } from './api-football'
import { logger } from '../lib/logger'

/**
 * Lazy live-data refresher. Triggered on demand from `/api/fixtures/:id`
 * when the fixture is in a live state. Uses one batch call to
 * `/fixtures?live=all` to update every live fixture in the DB at once,
 * which is cheaper than per-fixture polling.
 *
 * Three guardrails to keep us under the 100 req/day API-Football free
 * tier with margin for other endpoints:
 *   1. ENABLE_LIVE_UPDATES env flag (default on; flip to "false" to hard-disable)
 *   2. 60s cooldown between batch fetches
 *   3. Daily quota counter; aborts when >= LIVE_UPDATE_DAILY_QUOTA (default 60)
 *
 * Failure modes are silent — callers always get the latest DB row, even
 * if the refresh aborted. Live-state inaccuracy is preferable to 5xxs.
 */

type ApiFootballFixture = {
  fixture?: {
    id?: number
    status?: { short?: string; elapsed?: number | null }
  }
  goals?: { home?: number | null; away?: number | null }
  league?: { id?: number }
}

const STATUS_MAP: Record<string, 'LIVE' | 'HALFTIME' | 'FINISHED'> = {
  '1H': 'LIVE',
  '2H': 'LIVE',
  ET: 'LIVE',
  P: 'LIVE',
  BT: 'LIVE',
  HT: 'HALFTIME',
  FT: 'FINISHED',
  AET: 'FINISHED',
  PEN: 'FINISHED',
}

const COOLDOWN_MS = 60_000
const DAILY_QUOTA = parseInt(process.env.LIVE_UPDATE_DAILY_QUOTA || '60', 10)
const ENABLED = (process.env.ENABLE_LIVE_UPDATES ?? 'true') !== 'false'

const state = {
  lastRefreshMs: 0,
  callsToday: 0,
  dayKey: '',
  inflight: null as Promise<void> | null,
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function rolloverIfNewDay() {
  const k = todayKey()
  if (k !== state.dayKey) {
    state.dayKey = k
    state.callsToday = 0
  }
}

/**
 * Refreshes every currently-live fixture in the DB from a single
 * API-Football call. Honors cooldown and daily quota. Concurrent calls
 * await the same in-flight refresh.
 */
export async function refreshLiveFixtures(): Promise<{
  refreshed: number
  skipped: 'cooldown' | 'quota' | 'disabled' | null
}> {
  if (!ENABLED) return { refreshed: 0, skipped: 'disabled' }

  rolloverIfNewDay()
  if (state.callsToday >= DAILY_QUOTA) {
    return { refreshed: 0, skipped: 'quota' }
  }
  const since = Date.now() - state.lastRefreshMs
  if (since < COOLDOWN_MS) return { refreshed: 0, skipped: 'cooldown' }

  if (state.inflight) {
    await state.inflight
    return { refreshed: 0, skipped: null }
  }

  state.inflight = (async () => {
    try {
      state.callsToday += 1
      state.lastRefreshMs = Date.now()
      const data = await apiFootballClient.getLiveFixtures()
      const list: ApiFootballFixture[] = Array.isArray(data?.response)
        ? data.response
        : []

      let refreshed = 0
      for (const f of list) {
        const apiId = f.fixture?.id
        if (!apiId) continue
        const short = f.fixture?.status?.short || ''
        const status = STATUS_MAP[short]
        if (!status) continue

        try {
          await prisma.fixture.update({
            where: { apiId },
            data: {
              status,
              minute: f.fixture?.status?.elapsed ?? null,
              homeScore: f.goals?.home ?? null,
              awayScore: f.goals?.away ?? null,
            },
          })
          refreshed += 1
        } catch (e) {
          // Fixture not yet in our DB — ignore; sync flow will create it
          // when a user hits the day's fixture list.
          logger.debug(
            { apiId, err: (e as Error).message },
            'live-update: fixture not in DB, skipping'
          )
        }
      }

      logger.info(
        { refreshed, total: list.length, callsToday: state.callsToday },
        'live-update: refreshed batch'
      )
    } catch (e) {
      logger.warn(
        { err: (e as Error).message },
        'live-update: API-Football call failed; serving stale DB data'
      )
    } finally {
      state.inflight = null
    }
  })()

  await state.inflight
  return { refreshed: 0, skipped: null }
}

/**
 * Finalize stale "live" fixtures. The live feed only contains matches that
 * are CURRENTLY in play — once a match ends it vanishes from `live=all`, so
 * without this step a fixture whose final whistle nobody watched stays LIVE
 * in the DB forever. That wedges everything downstream: post-match reports
 * never generate, the performance page stays empty, the match never moves
 * to "Biten".
 *
 * Any fixture still LIVE/HALFTIME ≥3h after kickoff is over (covers ET +
 * pens). We fetch its final result by id; if the API can't confirm but the
 * row is ≥12h old, we close it with the last known score rather than leave
 * it wedged.
 */
export async function finalizeStaleLiveFixtures(): Promise<{
  finalized: number
}> {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const stale = await prisma.fixture.findMany({
    where: {
      status: { in: ['LIVE', 'HALFTIME'] },
      matchDate: { lt: threeHoursAgo },
    },
    select: { id: true, apiId: true, matchDate: true },
    take: 10,
  })
  if (stale.length === 0) return { finalized: 0 }

  let finalized = 0
  for (const fx of stale) {
    try {
      const data = await apiFootballClient.getFixtureById(fx.apiId)
      const row: ApiFootballFixture | undefined = data?.response?.[0]
      const short = row?.fixture?.status?.short || ''
      const status = STATUS_MAP[short]
      if (status) {
        await prisma.fixture.update({
          where: { id: fx.id },
          data: {
            status,
            minute: status === 'FINISHED' ? null : (row?.fixture?.status?.elapsed ?? null),
            ...(row?.goals?.home != null ? { homeScore: row.goals.home } : {}),
            ...(row?.goals?.away != null ? { awayScore: row.goals.away } : {}),
          },
        })
        if (status === 'FINISHED') finalized++
        continue
      }
      // API returned an unmapped/unknown state — fall through to age check.
    } catch (e) {
      logger.warn(
        { apiId: fx.apiId, err: (e as Error).message },
        'finalize: per-fixture lookup failed'
      )
    }
    // Last resort: a "live" row half a day old is over no matter what the
    // API says — close it with the last known score so nothing stays wedged.
    if (fx.matchDate.getTime() < Date.now() - 12 * 60 * 60 * 1000) {
      await prisma.fixture
        .update({
          where: { id: fx.id },
          data: { status: 'FINISHED', minute: null },
        })
        .catch(() => undefined)
      finalized++
    }
  }

  if (finalized > 0) {
    logger.info({ finalized, checked: stale.length }, 'finalize: closed stale live fixtures')
  }
  return { finalized }
}

/** Health/diagnostics for the live updater. */
export function getLiveUpdaterStatus() {
  rolloverIfNewDay()
  return {
    enabled: ENABLED,
    callsToday: state.callsToday,
    dailyQuota: DAILY_QUOTA,
    lastRefreshMs: state.lastRefreshMs,
    cooldownRemainingMs: Math.max(
      0,
      COOLDOWN_MS - (Date.now() - state.lastRefreshMs)
    ),
  }
}
