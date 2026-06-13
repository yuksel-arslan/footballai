import { prisma } from '@football-ai/database'
import { cache } from './cache'
import { logger } from '../lib/logger'
import { canonicalTeamName } from '../lib/team-name'

/**
 * Measurable team & player analytics mined from OUR match archive — the
 * sellable layer on top of the raw data:
 *
 * - Team strength indices (attack/defence/overall): exponentially
 *   time-decayed goal rates relative to the pool average — the closed-form
 *   cousin of the Dixon-Coles MLE strengths (Maher '82 / DC '97 family),
 *   recomputed live from every stored match.
 * - Form score (0-100): time-decayed points (3/1/0) weighted by opponent
 *   strength, so beating strong sides counts more than farming weak ones.
 * - Player metrics from match_events: goals, assists, penalties, cards,
 *   per-match rates.
 *
 * Half-life ≈ 90 days (xi = ln2/90 per day), matching the recency emphasis
 * of the prediction engine.
 */

const XI = Math.log(2) / 90 // per-day decay
const wOf = (date: Date, now: number): number =>
  Math.exp(-XI * Math.max(0, (now - date.getTime()) / 86400000))

export interface TeamStrength {
  team: string
  matches: number
  attack: number // 1.0 = pool average; >1 scores more than average
  defence: number // 1.0 = pool average; >1 concedes LESS than average
  overall: number // 0-100 composite
  form: number // 0-100 opponent-adjusted decayed form
  rank?: number
}

export interface PlayerStat {
  player: string
  team: string
  goals: number
  penalties: number
  assists: number
  yellows: number
  reds: number
  matches: number
}

class AnalyticsService {
  /**
   * Strength + form table for one organization (league apiId). Cached 1h.
   */
  async teamStrengths(leagueApiId: number): Promise<TeamStrength[]> {
    const cacheKey = cache.key('analytics:strengths', leagueApiId)
    const cached = await cache.get<TeamStrength[]>(cacheKey)
    if (cached) return cached

    const league = await prisma.league.findUnique({
      where: { apiId: leagueApiId },
      select: { id: true },
    })
    if (!league) return []

    // The ranking universe: every team that appears in this organization's
    // fixture list (any status). The MEASUREMENT pool is wider — those teams'
    // full finished archive across all competitions (qualifiers, friendlies,
    // other leagues) — because a tournament that just started has too few of
    // its own matches to measure anything.
    const orgFixtures = await prisma.fixture.findMany({
      where: { leagueId: league.id },
      select: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
      take: 2000,
    })
    const participantKeys = new Set<string>()
    for (const f of orgFixtures) {
      participantKeys.add(canonicalTeamName(f.homeTeam.name))
      participantKeys.add(canonicalTeamName(f.awayTeam.name))
    }
    if (participantKeys.size === 0) return []

    // Cross-provider duplicates share a canonical NAME but not a team id, so
    // resolve participant team ids by canonical name in JS.
    const allTeams = await prisma.team.findMany({
      select: { id: true, name: true },
    })
    const teamIds = allTeams
      .filter((t) => participantKeys.has(canonicalTeamName(t.name)))
      .map((t) => t.id)

    const rows = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
      },
      orderBy: { matchDate: 'desc' },
      take: 1500,
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })
    if (rows.length < 10) return []

    const now = Date.now()
    type Acc = {
      name: string
      w: number
      gf: number
      ga: number
      results: {
        w: number
        gf: number
        ga: number
        pts: number
        oppKey: string
      }[]
    }
    const acc = new Map<string, Acc>()
    const get = (name: string): Acc => {
      const k = canonicalTeamName(name)
      let a = acc.get(k)
      if (!a) {
        a = { name, w: 0, gf: 0, ga: 0, results: [] }
        acc.set(k, a)
      }
      return a
    }

    let poolW = 0
    let poolGoals = 0
    for (const f of rows) {
      const w = wOf(f.matchDate, now)
      const h = get(f.homeTeam.name)
      const a = get(f.awayTeam.name)
      h.w += w
      a.w += w
      h.gf += w * f.homeScore!
      h.ga += w * f.awayScore!
      a.gf += w * f.awayScore!
      a.ga += w * f.homeScore!
      poolW += 2 * w
      poolGoals += w * (f.homeScore! + f.awayScore!)
      const hPts =
        f.homeScore! > f.awayScore! ? 3 : f.homeScore! === f.awayScore! ? 1 : 0
      h.results.push({
        w,
        gf: f.homeScore!,
        ga: f.awayScore!,
        pts: hPts,
        oppKey: canonicalTeamName(f.awayTeam.name),
      })
      a.results.push({
        w,
        gf: f.awayScore!,
        ga: f.homeScore!,
        pts: hPts === 3 ? 0 : hPts === 0 ? 3 : 1,
        oppKey: canonicalTeamName(f.homeTeam.name),
      })
    }
    const avgGoals = poolGoals / (poolW || 1) // decayed goals per team-match
    const lg = avgGoals || 1

    // Opponent-adjusted attack/defence (iterative, Dixon-Coles spirit). Raw
    // goal ratios reward a soft schedule: a team that scores freely against
    // weak defences looks elite when it isn't. So each side's attack is judged
    // against the DEFENCE of the opponents it actually faced, and its defence
    // against their ATTACK — solved by a few convergence passes. `attack` and
    // `leak` are multiplicative (1.0 = pool average); displayed defence is
    // 1/leak so "higher = better" stays intact. Opponent factors are clamped
    // so a single freak result or a thin-sample opponent can't dominate.
    const attack = new Map<string, number>()
    const leak = new Map<string, number>() // goals conceded factor; lower = better
    for (const [k, t] of acc) {
      if (t.w <= 0) continue
      attack.set(k, Math.min(Math.max(t.gf / t.w / lg, 0.2), 3))
      leak.set(k, Math.min(Math.max(t.ga / t.w / lg, 0.2), 3))
    }
    const clampF = (n: number) => Math.min(Math.max(n, 0.45), 2.2)
    for (let iter = 0; iter < 6; iter++) {
      const nextAttack = new Map<string, number>()
      const nextLeak = new Map<string, number>()
      for (const [k, t] of acc) {
        if (t.w <= 0) continue
        let gfExp = 0
        let gaExp = 0
        for (const r of t.results) {
          const oppLeak = clampF(leak.get(r.oppKey) ?? 1)
          const oppAtt = clampF(attack.get(r.oppKey) ?? 1)
          gfExp += r.w * lg * oppLeak // goals an avg attack would score on them
          gaExp += r.w * lg * oppAtt // goals their avg-defended opponents would score
        }
        nextAttack.set(
          k,
          Math.min(Math.max(t.gf / Math.max(gfExp, 1e-9), 0.2), 3)
        )
        nextLeak.set(
          k,
          Math.min(Math.max(t.ga / Math.max(gaExp, 1e-9), 0.2), 3)
        )
      }
      for (const [k, v] of nextAttack) attack.set(k, v)
      for (const [k, v] of nextLeak) leak.set(k, v)
    }

    // Final pass: opponent-adjusted form (beating strong sides counts more)
    // and the composite rating. Only org participants are ranked; pool-only
    // teams exist solely as opponent-strength context.
    const strengthOf = (k: string): number => {
      const at = attack.get(k)
      const lk = leak.get(k)
      return at != null && lk != null ? Math.sqrt(at / lk) : 1
    }
    const out: TeamStrength[] = []
    for (const [k, t] of acc) {
      const at = attack.get(k)
      const lk = leak.get(k)
      if (at == null || lk == null || t.results.length < 3) continue
      if (!participantKeys.has(k)) continue
      let num = 0
      let den = 0
      for (const r of t.results) {
        const oppFactor = Math.min(Math.max(strengthOf(r.oppKey), 0.6), 1.6)
        num += r.w * r.pts * oppFactor
        den += r.w * 3 * 1.0
      }
      const form = Math.round(Math.min((num / Math.max(den, 1e-9)) * 100, 100))
      const defence = 1 / lk
      // Overall: opponent-adjusted geometric mean mapped to 0-100 (1.0 → 50).
      const composite = Math.sqrt(at * defence)
      const overall = Math.round(Math.min(Math.max(50 * composite, 1), 99))
      out.push({
        team: t.name,
        matches: t.results.length,
        attack: Math.round(at * 100) / 100,
        defence: Math.round(defence * 100) / 100,
        overall,
        form,
      })
    }
    out.sort((a, b) => b.overall - a.overall)
    out.forEach((t, i) => (t.rank = i + 1))

    await cache.set(cacheKey, out, 60 * 60)
    return out
  }

  /** One team's strength row (by name, canonical match) within an org. */
  async teamStrength(
    leagueApiId: number,
    teamName: string
  ): Promise<TeamStrength | null> {
    const table = await this.teamStrengths(leagueApiId)
    const key = canonicalTeamName(teamName)
    return table.find((t) => canonicalTeamName(t.team) === key) ?? null
  }

  /** Top scorers (goals incl. penalties, with assists/cards) for an org. */
  async topPlayers(leagueApiId: number, limit = 10): Promise<PlayerStat[]> {
    const cacheKey = cache.key('analytics:players', leagueApiId, limit)
    const cached = await cache.get<PlayerStat[]>(cacheKey)
    if (cached) return cached

    const league = await prisma.league.findUnique({
      where: { apiId: leagueApiId },
      select: { id: true },
    })
    if (!league) return []

    const events = await prisma.matchEvent.findMany({
      where: { leagueId: league.id },
      include: {
        fixture: {
          select: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      take: 5000,
    })
    const players = this.aggregatePlayers(events)
    const top = players
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
      .slice(0, limit)
    await cache.set(cacheKey, top, 60 * 60)
    return top
  }

  /** A team's player metrics (its scorers/carded players) within an org. */
  async teamPlayers(
    leagueApiId: number,
    teamName: string,
    limit = 5
  ): Promise<PlayerStat[]> {
    const league = await prisma.league.findUnique({
      where: { apiId: leagueApiId },
      select: { id: true },
    })
    if (!league) return []
    const key = canonicalTeamName(teamName)
    const events = await prisma.matchEvent.findMany({
      where: { leagueId: league.id },
      include: {
        fixture: {
          select: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      take: 5000,
    })
    return this.aggregatePlayers(events)
      .filter((p) => canonicalTeamName(p.team) === key)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
      .slice(0, limit)
  }

  private aggregatePlayers(
    events: {
      type: string
      team: string
      player: string
      detail: string | null
      fixtureId: number
      fixture: { homeTeam: { name: string }; awayTeam: { name: string } }
    }[]
  ): PlayerStat[] {
    const map = new Map<string, PlayerStat & { fixtures: Set<number> }>()
    const get = (player: string, team: string) => {
      const k = `${player}|${canonicalTeamName(team)}`
      let p = map.get(k)
      if (!p) {
        p = {
          player,
          team,
          goals: 0,
          penalties: 0,
          assists: 0,
          yellows: 0,
          reds: 0,
          matches: 0,
          fixtures: new Set<number>(),
        }
        map.set(k, p)
      }
      return p
    }
    for (const e of events) {
      const teamName =
        e.team === 'home' ? e.fixture.homeTeam.name : e.fixture.awayTeam.name
      if (e.type === 'goal' || e.type === 'penalty') {
        const p = get(e.player, teamName)
        p.goals++
        if (e.type === 'penalty') p.penalties++
        p.fixtures.add(e.fixtureId)
        if (e.detail) {
          const a = get(e.detail, teamName)
          a.assists++
          a.fixtures.add(e.fixtureId)
        }
      } else if (e.type === 'yellow' || e.type === 'red') {
        const p = get(e.player, teamName)
        if (e.type === 'yellow') p.yellows++
        else p.reds++
        p.fixtures.add(e.fixtureId)
      }
    }
    return [...map.values()].map(({ fixtures, ...p }) => ({
      ...p,
      matches: fixtures.size,
    }))
  }

  /**
   * Backfill match_events for recently finished fixtures missing them
   * (report generation also writes events; this sweeps anything skipped).
   */
  async backfillEvents(limit = 10): Promise<{ filled: number }> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fixtures = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        matchDate: { gte: since },
        events: { none: {} },
      },
      select: { apiId: true },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })
    let filled = 0
    const { reportService } = await import('./report.service')
    for (const f of fixtures) {
      try {
        // Regeneration path also fetches+persists events.
        const r = await reportService.getForFixture(f.apiId)
        if (r) filled++
      } catch (e) {
        logger.debug(
          { apiId: f.apiId, err: (e as Error).message },
          'analytics: event backfill skip'
        )
      }
    }
    return { filled }
  }
}

export const analyticsService = new AnalyticsService()
