import { prisma } from '@football-ai/database'
import { apiFootballClient } from './api-football'
import { cache } from './cache'
import { config } from '../config'
import { logger } from '../lib/logger'

// Curated competitions the system operates on (API-Football league ids) —
// betting-site coverage: users should find what they look for. Season
// calendar sync auto-activates/deactivates each one, so off-season entries
// cost nothing. KEEP IN SYNC with CURATED_LEAGUE_IDS in apps/web/src/lib/api.ts.
export const CURATED_LEAGUE_IDS = new Set<number>([
  // ── top European leagues ──
  39, // Premier League
  140, // La Liga
  78, // Bundesliga
  135, // Serie A
  61, // Ligue 1
  203, // Süper Lig
  94, // Primeira Liga
  88, // Eredivisie
  144, // Belgian Pro League
  179, // Scottish Premiership
  197, // Greek Super League
  207, // Swiss Super League
  218, // Austrian Bundesliga
  119, // Danish Superliga
  103, // Eliteserien (NO)
  113, // Allsvenskan (SE)
  106, // Ekstraklasa (PL)
  40, // Championship (ENG 2)
  // ── domestic cups ──
  45, // FA Cup
  143, // Copa del Rey
  137, // Coppa Italia
  81, // DFB Pokal
  66, // Coupe de France
  // ── Americas / Asia ──
  71, // Brasileirão
  128, // Liga Profesional (AR)
  253, // MLS
  262, // Liga MX
  98, // J1 League
  292, // K League 1
  307, // Saudi Pro League
  // ── European cups ──
  2, // Champions League
  3, // Europa League
  848, // Conference League
  // ── international tournaments ──
  1, // World Cup
  4, // Euro
  5, // Nations League
  9, // Copa America
  6, // Africa Cup of Nations
  7, // Asian Cup
  13, // Copa Libertadores
  11, // Copa Sudamericana
  15, // FIFA Club World Cup
])

// International (national-team) competitions, API-Football league ids.
// Tournament-only history is too thin to fit a rating model, so these share
// one rating pool: 1 WC, 4 Euro, 5 Nations League, 6 Africa Cup, 7 Asian Cup,
// 9 Copa America, 10 Friendlies, 29-34 WC qualifiers (per confederation).
export const INTERNATIONAL_LEAGUE_API_IDS = [
  1, 4, 5, 6, 7, 9, 10, 29, 30, 31, 32, 33, 34,
]

class FixtureService {
  /**
   * The lists only show organizations whose season is open (League.active,
   * driven by the provider season calendar). Fails open when no league is
   * active (calendar never synced) so the lists are never empty by accident.
   */
  private async activeLeagueWhere(): Promise<Record<string, unknown>> {
    const activeCount = await prisma.league.count({ where: { active: true } })
    return activeCount > 0 ? { league: { active: true } } : {}
  }

  // Get upcoming fixtures
  async getUpcomingFixtures(params: {
    date?: string
    league?: number
    team?: number
    limit?: number
    offset?: number
  }) {
    const cacheKey = cache.key('fixtures:upcoming', JSON.stringify(params))

    // Try cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      logger.debug('Cache hit: upcoming fixtures')
      return cached
    }

    // Query database — restricted to in-season organizations
    const where: any = {
      status: 'SCHEDULED',
      matchDate: {
        gte: new Date(),
      },
      ...(await this.activeLeagueWhere()),
    }

    if (params.league) {
      where.leagueId = params.league
      delete where.league // explicit league overrides the active filter
    }

    if (params.team) {
      where.OR = [{ homeTeamId: params.team }, { awayTeamId: params.team }]
    }

    const fixtures = await prisma.fixture.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: {
        matchDate: 'asc',
      },
      take: params.limit || 20,
      skip: params.offset || 0,
    })

    // Cache result
    await cache.set(cacheKey, fixtures, config.cache.upcomingFixtures)

    return fixtures
  }

  // Get live fixtures
  async getLiveFixtures() {
    const cacheKey = cache.key('fixtures:live')

    const cached = await cache.get(cacheKey)
    if (cached) {
      logger.debug('Cache hit: live fixtures')
      return cached
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        status: { in: ['LIVE', 'HALFTIME'] },
        ...(await this.activeLeagueWhere()),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
        liveScore: true,
      },
      orderBy: {
        matchDate: 'desc',
      },
    })

    await cache.set(cacheKey, fixtures, config.cache.liveScores)

    return fixtures
  }

  // Get finished fixtures
  async getFinishedFixtures(params: {
    date?: string
    league?: number
    limit?: number
    offset?: number
  }) {
    const cacheKey = cache.key('fixtures:finished', JSON.stringify(params))

    const cached = await cache.get(cacheKey)
    if (cached) return cached

    const where: any = {
      status: 'FINISHED',
      ...(await this.activeLeagueWhere()),
    }

    if (params.date) {
      const date = new Date(params.date)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      where.matchDate = { gte: date, lt: nextDay }
    }

    if (params.league) {
      where.leagueId = params.league
      delete where.league // explicit league overrides the active filter
    }

    const fixtures = await prisma.fixture.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: { matchDate: 'desc' },
      take: params.limit || 20,
      skip: params.offset || 0,
    })

    await cache.set(cacheKey, fixtures, config.cache.upcomingFixtures)
    return fixtures
  }

  // Get fixture by ID (accepts internal id OR provider apiId — callers link
  // with apiIds, including negative FD-sourced ones)
  async getFixtureById(id: number) {
    const cacheKey = cache.key('fixture', id)

    const cached = await cache.get(cacheKey)
    if (cached) {
      logger.debug({ fixtureId: id }, 'Cache hit: fixture')
      return cached
    }

    const fixture = await prisma.fixture.findFirst({
      where: { OR: [{ apiId: id }, { id }] },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
        liveScore: true,
        predictions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    if (fixture) {
      await cache.set(cacheKey, fixture, config.cache.upcomingFixtures)
    }

    return fixture
  }

  // Sync fixtures from API Football
  async syncFixtures(params: { date?: string; league?: number }) {
    logger.info('Syncing fixtures from API Football...')

    const apiParams: any = {
      date: params.date || new Date().toISOString().split('T')[0],
    }

    if (params.league) {
      apiParams.league = params.league
      apiParams.season = new Date().getFullYear()
    }

    const response = await apiFootballClient.getFixtures(apiParams)
    const apiFixtures = response.response || []

    let synced = 0
    let updated = 0

    for (const apiFixture of apiFixtures) {
      try {
        // Whitelist: only curated competitions are stored.
        if (!CURATED_LEAGUE_IDS.has(apiFixture.league?.id)) continue

        // Check if fixture exists
        const existing = await prisma.fixture.findUnique({
          where: { apiId: apiFixture.fixture.id },
        })

        if (existing) {
          // Update existing
          await prisma.fixture.update({
            where: { apiId: apiFixture.fixture.id },
            data: {
              status: this.mapStatus(apiFixture.fixture.status.short),
              homeScore: apiFixture.goals.home,
              awayScore: apiFixture.goals.away,
              minute: apiFixture.fixture.status.elapsed,
            },
          })
          updated++
        } else {
          // Create new
          await this.createFixtureFromApi(apiFixture)
          synced++
        }
      } catch (error) {
        logger.error({ error }, 'Error syncing fixture')
      }
    }

    logger.info(
      { synced, updated },
      `Synced ${synced} new fixtures, updated ${updated}`
    )

    // Clear cache
    await cache.clear('fixtures:*')

    return { synced, updated }
  }

  // Backfill historical FINISHED fixtures (with scores) for a league/season so
  // the Dixon-Coles engine has data to fit on. Pulls the whole season from
  // API-Football and upserts; finished matches land as status=FINISHED.
  async backfillFinished(params: { league: number; season?: number }) {
    const season = params.season ?? this.currentSeason()
    logger.info(
      { league: params.league, season },
      'Backfilling finished fixtures...'
    )

    const response = await apiFootballClient.getFixtures({
      league: params.league,
      season,
    })
    const apiFixtures = (response.response || []) as any[]

    let created = 0
    let updated = 0
    let finished = 0

    for (const apiFixture of apiFixtures) {
      try {
        const isFinished =
          this.mapStatus(apiFixture.fixture.status.short) === 'FINISHED'
        const result = await this.upsertFixtureFromApi(apiFixture)
        if (result === 'created') created++
        else updated++
        if (isFinished) finished++
      } catch (error) {
        logger.error({ error }, 'Error backfilling fixture')
      }
    }

    await cache.clear('fixtures:*')
    logger.info(
      { league: params.league, season, created, updated, finished },
      'Backfill complete'
    )
    return {
      league: params.league,
      season,
      total: apiFixtures.length,
      created,
      updated,
      finished,
    }
  }

  // Helper: upsert a single API fixture (create new or refresh status/score).
  private async upsertFixtureFromApi(
    apiFixture: any
  ): Promise<'created' | 'updated'> {
    const existing = await prisma.fixture.findUnique({
      where: { apiId: apiFixture.fixture.id },
    })
    if (existing) {
      await prisma.fixture.update({
        where: { apiId: apiFixture.fixture.id },
        data: {
          status: this.mapStatus(apiFixture.fixture.status.short),
          homeScore: apiFixture.goals.home,
          awayScore: apiFixture.goals.away,
          minute: apiFixture.fixture.status.elapsed,
        },
      })
      return 'updated'
    }
    await this.createFixtureFromApi(apiFixture)
    return 'created'
  }

  // Football seasons span Aug→May; before July belongs to the previous year.
  private currentSeason(): number {
    const now = new Date()
    return now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
  }

  // Helper: Create fixture from API data
  private async createFixtureFromApi(apiFixture: any) {
    // Ensure teams exist
    const homeTeam = await this.ensureTeam(apiFixture.teams.home)
    const awayTeam = await this.ensureTeam(apiFixture.teams.away)
    const league = await this.ensureLeague(apiFixture.league)

    return prisma.fixture.create({
      data: {
        apiId: apiFixture.fixture.id,
        matchDate: new Date(apiFixture.fixture.date),
        status: this.mapStatus(apiFixture.fixture.status.short),
        homeScore: apiFixture.goals.home,
        awayScore: apiFixture.goals.away,
        venue: apiFixture.fixture.venue.name,
        referee: apiFixture.fixture.referee,
        round: apiFixture.league.round,
        season: apiFixture.league.season,
        minute: apiFixture.fixture.status.elapsed,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        leagueId: league.id,
      },
    })
  }

  // Helper: Ensure team exists
  private async ensureTeam(apiTeam: any) {
    const existing = await prisma.team.findUnique({
      where: { apiId: apiTeam.id },
    })

    if (existing) return existing

    return prisma.team.create({
      data: {
        apiId: apiTeam.id,
        name: apiTeam.name,
        logoUrl: apiTeam.logo,
        country: 'Unknown', // Will be updated later
      },
    })
  }

  // Helper: Ensure league exists
  private async ensureLeague(apiLeague: any) {
    const existing = await prisma.league.findFirst({
      where: {
        apiId: apiLeague.id,
        season: apiLeague.season,
      },
    })

    if (existing) return existing

    return prisma.league.create({
      data: {
        apiId: apiLeague.id,
        name: apiLeague.name,
        country: apiLeague.country,
        logoUrl: apiLeague.logo,
        season: apiLeague.season,
        // Default passive; only curated competitions start active.
        active: CURATED_LEAGUE_IDS.has(apiLeague.id),
      },
    })
  }

  /**
   * Fetch a single fixture from API-Football by its api id and store it when
   * missing (curated competitions only). Returns the DB row or null.
   */
  async ensureFixtureByApiId(apiId: number) {
    const existing = await prisma.fixture.findUnique({ where: { apiId } })
    if (existing) return existing
    try {
      const response = await apiFootballClient.getFixtures({ id: apiId })
      const apiFixture = (response.response || [])[0]
      if (!apiFixture) return null
      if (!CURATED_LEAGUE_IDS.has(apiFixture.league?.id)) return null
      await this.upsertFixtureFromApi(apiFixture)
      return prisma.fixture.findUnique({ where: { apiId } })
    } catch (error) {
      logger.error({ error, apiId }, 'ensureFixtureByApiId failed')
      return null
    }
  }

  // On-demand international history backfill state. The in-memory flag guards
  // a single process; Redis carries the state across redeploys/instances so a
  // restart mid-run doesn't lose progress tracking and block retries.
  private intlBackfillRunning = false

  /**
   * Kick off the national-team history backfill in the background. Returns
   * true while a run is in progress or was just started, false when a run
   * already completed recently (throttled to once per 6h — each run costs one
   * API-Football request per league+season and thousands of DB upserts, so it
   * must never block a request). The running lock has a 15-minute TTL: if a
   * deploy kills the run, a retry unblocks automatically.
   */
  async tryStartInternationalBackfill(): Promise<boolean> {
    const SIX_HOURS = 6 * 60 * 60
    if (this.intlBackfillRunning) return true
    if (await cache.get('intl-backfill:v4:running')) return true
    if (await cache.get('intl-backfill:v4:done')) return false
    // A recent run finished but produced no usable pool (API errors, missing
    // key, plan limits): don't hammer the API — and don't claim "preparing".
    if (await cache.get('intl-backfill:v4:cooldown')) return false

    this.intlBackfillRunning = true
    await cache.set('intl-backfill:v4:running', 1, 15 * 60)
    this.backfillInternationalHistory()
      .then(async () => {
        // Only mark done when the pool is actually usable; otherwise apply a
        // short cooldown so the next attempt retries in 10 minutes.
        const poolSize = await prisma.fixture.count({
          where: {
            status: 'FINISHED',
            homeScore: { not: null },
            awayScore: { not: null },
            league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } },
          },
        })
        if (poolSize >= 20) {
          logger.info({ poolSize }, 'International history pool ready')
          await cache.set('intl-backfill:v4:done', 1, SIX_HOURS)
        } else {
          logger.error(
            { poolSize },
            'International backfill produced no usable pool — check API_FOOTBALL_KEY and plan'
          )
          await cache.set('intl-backfill:v4:cooldown', 1, 10 * 60)
        }
      })
      .catch((error) =>
        logger.error({ error }, 'International history backfill failed')
      )
      .finally(() => {
        this.intlBackfillRunning = false
        void cache.delete('intl-backfill:v4:running')
      })
    return true
  }

  /**
   * Backfill national-team match history (last World Cup, the current
   * tournament so far, and the qualifiers) so the Dixon-Coles engine can rate
   * national teams.
   */
  private async backfillInternationalHistory(): Promise<void> {
    const year = new Date().getFullYear()
    const targets: Array<{ league: number; season: number }> = [
      { league: 1, season: 2022 }, // last World Cup
      { league: 1, season: year }, // current tournament (finished games so far)
      { league: 4, season: year - 2 }, // Euro (e.g. 2024) — covers UEFA sides
      { league: 5, season: year - 2 }, // Nations League spans two years
      { league: 5, season: year - 1 },
      { league: 6, season: year - 3 }, // Africa Cup of Nations (e.g. 2023)
      { league: 6, season: year - 1 }, // AFCON (e.g. 2025) — covers CAF sides
      { league: 7, season: year - 3 }, // Asian Cup
      { league: 9, season: year - 2 }, // Copa America
    ]
    // Qualifiers: API-Football season labels vary per confederation (some use
    // the tournament year, some the playing year) — try a 4-year window.
    for (const league of [29, 30, 31, 32, 33, 34]) {
      targets.push({ league, season: year - 3 })
      targets.push({ league, season: year - 2 })
      targets.push({ league, season: year - 1 })
      targets.push({ league, season: year })
    }

    logger.info('Backfilling international match history...')
    for (const t of targets) {
      try {
        const r = await this.backfillFinished(t)
        if (r.total === 0) {
          logger.warn(
            { ...t },
            'International backfill target returned 0 fixtures'
          )
        }
      } catch (error) {
        logger.warn({ error, ...t }, 'International backfill target failed')
      }
    }

    // League-level sources can still miss teams (season-label quirks). Sweep
    // the tournament roster and load per-team history for anyone left out.
    try {
      const sweep = await this.ensureWorldCupTeamHistory()
      logger.info(sweep, 'World Cup team-history sweep complete')
    } catch (error) {
      logger.warn({ error }, 'World Cup team-history sweep failed')
    }

    logger.info('International match history backfill complete')
  }

  /**
   * Sync each curated competition's current-season window from the provider
   * calendar (API-Football /leagues) and derive `active` automatically: a
   * league is active iff today falls inside its current season (with a small
   * grace buffer). Removes manual active/passive toggling — when a season
   * ends the competition drops out of the day's theme everywhere by itself.
   */
  async syncSeasonCalendar(): Promise<{
    updated: number
    activated: string[]
    deactivated: string[]
  }> {
    const GRACE_MS = 7 * 24 * 60 * 60 * 1000
    let updated = 0
    const activated: string[] = []
    const deactivated: string[] = []

    for (const apiId of CURATED_LEAGUE_IDS) {
      try {
        const res = await apiFootballClient.getLeagues({ id: apiId })
        const entry = (res.response || [])[0]
        const seasons = (entry?.seasons ?? []) as any[]
        const current =
          seasons.find((s) => s.current) ?? seasons[seasons.length - 1]
        if (!current?.start || !current?.end) continue

        const start = new Date(current.start)
        const end = new Date(current.end)
        const now = Date.now()
        const isActive =
          now >= start.getTime() - GRACE_MS && now <= end.getTime() + GRACE_MS

        const league = await prisma.league.findUnique({
          where: { apiId },
          select: { name: true, active: true },
        })
        if (!league) continue

        await prisma.league.update({
          where: { apiId },
          data: { active: isActive },
        })
        updated++
        if (isActive && !league.active) activated.push(league.name)
        if (!isActive && league.active) deactivated.push(league.name)
      } catch (error) {
        logger.warn({ error, apiId }, 'Season calendar sync failed for league')
      }
    }

    logger.info({ updated, activated, deactivated }, 'Season calendar synced')
    return { updated, activated, deactivated }
  }

  /**
   * Self-healing loader: resolve a national team by name via the API and pull
   * its recent matches into the pool. Used as the last resort when a value
   * analysis can't find a team in the rating window — covers every future
   * naming/coverage gap without a code change. Returns # of stored fixtures.
   */
  async loadTeamHistoryByName(name: string): Promise<number> {
    try {
      const res = await apiFootballClient.searchTeams(name)
      const teams = (res.response || []) as any[]
      const team = teams.find((t) => t.team?.national) ?? teams[0]
      if (!team?.team?.id) return 0

      const fixtures = await apiFootballClient.getFixtures({
        team: team.team.id,
        last: 15,
      })
      let stored = 0
      for (const fx of (fixtures.response || []) as any[]) {
        try {
          await this.upsertFixtureFromApi(fx)
          stored++
        } catch (error) {
          logger.warn({ error, name }, 'Self-heal fixture upsert failed')
        }
      }
      logger.info({ name, stored }, 'Self-healed team history by name')
      return stored
    } catch (error) {
      logger.warn({ error, name }, 'Self-heal team lookup failed')
      return 0
    }
  }

  /**
   * Scan the current World Cup's participants and, for any team that has no
   * FINISHED match in the international pool, pull its last 15 matches
   * directly (team-level query — immune to league/season label quirks).
   */
  async ensureWorldCupTeamHistory(): Promise<{
    participants: number
    missing: string[]
    loaded: string[]
  }> {
    const year = new Date().getFullYear()

    // Roster: every team appearing in the current WC's fixtures
    const wc = await apiFootballClient.getFixtures({ league: 1, season: year })
    const roster = new Map<number, string>()
    for (const fx of (wc.response || []) as any[]) {
      for (const side of ['home', 'away'] as const) {
        const t = fx.teams?.[side]
        if (t?.id && t?.name) roster.set(t.id, t.name)
      }
    }

    // Teams already rateable from the pool
    const pool = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        homeScore: { not: null },
        league: { apiId: { in: INTERNATIONAL_LEAGUE_API_IDS } },
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
      take: 3000,
    })
    const rated = new Set<string>()
    for (const f of pool) {
      rated.add(f.homeTeam.name)
      rated.add(f.awayTeam.name)
    }

    const missing: string[] = []
    const loaded: string[] = []
    for (const [teamId, name] of roster) {
      if (rated.has(name)) continue
      missing.push(name)
      try {
        const r = await apiFootballClient.getFixtures({
          team: teamId,
          last: 15,
        })
        let stored = 0
        for (const apiFixture of (r.response || []) as any[]) {
          try {
            await this.upsertFixtureFromApi(apiFixture)
            stored++
          } catch (error) {
            logger.warn({ error, name }, 'Team-history fixture upsert failed')
          }
        }
        if (stored > 0) loaded.push(`${name} (${stored})`)
      } catch (error) {
        logger.warn({ error, teamId, name }, 'Team-history fetch failed')
      }
    }

    return { participants: roster.size, missing, loaded }
  }

  // Sync fixtures from all configured providers
  async syncFromProviders() {
    logger.info('Syncing fixtures from providers...')
    // Today + the next 7 days: the DB is the single source of truth for the
    // upcoming list, so it needs real depth ahead of match day.
    for (let i = 0; i < 8; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      try {
        await this.syncFixtures({ date })
      } catch (error) {
        logger.error({ error, date }, 'Failed to sync fixtures from providers')
      }
    }
    // The list caches (1h TTL) must not serve pre-sync state.
    await cache.clear('*fixtures:*').catch(() => undefined)
  }

  /**
   * Football-Data fallback ingest for one active organization. Used when
   * API-Football returns nothing for the current season (plan restriction):
   * FD's free tier covers the big competitions including the World Cup, so
   * the DB gets filled either way. FD-sourced rows get NEGATIVE apiIds (no
   * collision with AF ids); the odds path self-heals them to real AF ids by
   * name+date when needed. Re-running upserts status/score onto existing
   * rows (matched by canonical team pair + day, source-agnostic) — which is
   * also how FD-sourced matches transition SCHEDULED → LIVE → FINISHED.
   */
  private async syncActiveLeagueFromFD(lg: {
    id: number
    apiId: number | null
    name: string
  }): Promise<{ created: number; updated: number }> {
    const AF_TO_FD_CODE: Record<number, string> = {
      1: 'WC',
      2: 'CL',
      3: 'EL',
      4: 'EC',
      39: 'PL',
      40: 'ELC',
      61: 'FL1',
      71: 'BSA',
      78: 'BL1',
      88: 'DED',
      94: 'PPL',
      135: 'SA',
      140: 'PD',
    }
    const FD_STATUS: Record<string, string> = {
      SCHEDULED: 'SCHEDULED',
      TIMED: 'SCHEDULED',
      IN_PLAY: 'LIVE',
      PAUSED: 'HALFTIME',
      FINISHED: 'FINISHED',
      POSTPONED: 'POSTPONED',
      SUSPENDED: 'POSTPONED',
      CANCELLED: 'CANCELLED',
    }
    const code = lg.apiId != null ? AF_TO_FD_CODE[lg.apiId] : undefined
    if (!code) return { created: 0, updated: 0 }

    const { footballDataClient } = await import('./football-data')
    const resp = await footballDataClient.getCompetitionMatches(code)
    const matches: any[] = resp?.matches ?? []
    if (matches.length === 0) return { created: 0, updated: 0 }

    const { canonicalTeamName } = await import('../lib/team-name')
    const dayOf = (iso: string) => String(iso).slice(0, 10)

    // Existing rows of this organization, keyed source-agnostically.
    const existing = await prisma.fixture.findMany({
      where: { leagueId: lg.id },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })
    const byKey = new Map<string, number>()
    for (const f of existing) {
      byKey.set(
        `${canonicalTeamName(f.homeTeam.name)}|${canonicalTeamName(
          f.awayTeam.name
        )}|${dayOf(f.matchDate.toISOString())}`,
        f.id
      )
    }

    const teamIdByName = new Map<string, number>()
    const ensureTeam = async (
      name: string,
      fdId: number | undefined
    ): Promise<number> => {
      const key = canonicalTeamName(name)
      const cached = teamIdByName.get(key)
      if (cached) return cached
      const found = await prisma.team.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (found) {
        teamIdByName.set(key, found.id)
        return found.id
      }
      const createdTeam = await prisma.team.create({
        data: {
          // Negative apiId: never collides with API-Football team ids.
          apiId: -(fdId ?? Math.floor(Math.random() * 1e9)),
          name,
          country: '',
        },
        select: { id: true },
      })
      teamIdByName.set(key, createdTeam.id)
      return createdTeam.id
    }

    let created = 0
    let updated = 0
    for (const m of matches) {
      const homeName = m?.homeTeam?.name
      const awayName = m?.awayTeam?.name
      const status = FD_STATUS[m?.status as string]
      if (!homeName || !awayName || !status || !m?.utcDate) continue // TBD slots

      const homeScore = m?.score?.fullTime?.home ?? null
      const awayScore = m?.score?.fullTime?.away ?? null
      // FD has no elapsed minute; estimate from kickoff while live.
      const minute =
        status === 'LIVE'
          ? Math.min(
              Math.max(
                Math.round(
                  (Date.now() - new Date(m.utcDate).getTime()) / 60000
                ),
                1
              ),
              90
            )
          : status === 'HALFTIME'
            ? 45
            : null

      const key = `${canonicalTeamName(homeName)}|${canonicalTeamName(
        awayName
      )}|${dayOf(m.utcDate)}`
      const hitId = byKey.get(key)
      if (hitId) {
        await prisma.fixture
          .update({
            where: { id: hitId },
            data: {
              status: status as any,
              matchDate: new Date(m.utcDate),
              minute,
              ...(homeScore != null ? { homeScore } : {}),
              ...(awayScore != null ? { awayScore } : {}),
            },
          })
          .catch(() => undefined)
        updated++
        continue
      }

      try {
        const homeTeamId = await ensureTeam(homeName, m?.homeTeam?.id)
        const awayTeamId = await ensureTeam(awayName, m?.awayTeam?.id)
        const row = await prisma.fixture.create({
          data: {
            apiId: -m.id, // FD-sourced: negative, collision-free
            matchDate: new Date(m.utcDate),
            status: status as any,
            homeScore,
            awayScore,
            minute,
            season: new Date(m.utcDate).getFullYear(),
            round:
              m?.stage && m.stage !== 'REGULAR_SEASON'
                ? String(m.stage)
                : m?.matchday != null
                  ? `Matchday ${m.matchday}`
                  : null,
            venue: m?.venue ?? null,
            leagueId: lg.id,
            homeTeamId,
            awayTeamId,
          },
          select: { id: true },
        })
        byKey.set(key, row.id)
        created++
      } catch {
        // unique clash or bad row — skip, keep the sweep going
      }
    }
    return { created, updated }
  }

  /**
   * Sync ALL fixtures of every active organization by league+season — the
   * whole tournament/season in one provider call per league, independent of
   * the global by-date endpoint (which some plans restrict). Falls back to
   * Football-Data per league when API-Football yields nothing, so the DB is
   * populated regardless of plan limits. Re-runs keep statuses fresh.
   */
  async syncActiveSeasons(): Promise<{
    leagues: number
    created: number
    updated: number
    errors: string[]
  }> {
    const active = await prisma.league.findMany({
      where: { active: true },
      select: { id: true, apiId: true, name: true },
    })
    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const lg of active) {
      if (lg.apiId == null) continue
      let afCreated = 0
      let afUpdated = 0
      try {
        // The league's CURRENT season year comes from the provider calendar
        // (WC 2026 → 2026; cross-year leagues → their start year).
        const meta = await apiFootballClient.getLeagues({ id: lg.apiId })
        const seasons = (meta?.response?.[0]?.seasons ?? []) as any[]
        const current =
          seasons.find((s) => s.current) ?? seasons[seasons.length - 1]
        const season = current?.year ?? new Date().getFullYear()

        const resp = await apiFootballClient.getFixtures({
          league: lg.apiId,
          season,
        })
        const apiErrors = resp?.errors
        if (apiErrors && Object.keys(apiErrors).length > 0) {
          errors.push(`${lg.name} (AF): ${JSON.stringify(apiErrors)}`)
        }
        for (const apiFixture of resp?.response ?? []) {
          try {
            const r = await this.upsertFixtureFromApi(apiFixture)
            if (r === 'created') afCreated++
            else afUpdated++
          } catch {
            // skip bad rows, keep the sweep going
          }
        }
      } catch (e) {
        errors.push(
          `${lg.name} (AF): ${e instanceof Error ? e.message : String(e)}`
        )
      }
      created += afCreated
      updated += afUpdated

      // The goal is a populated upcoming list with LIVE statuses. Run the
      // Football-Data pass when (a) this organization still has NO future
      // SCHEDULED fixtures after the AF pass (AF returned nothing useful), or
      // (b) it has FD-sourced rows (negative apiId) in the action window —
      // kicked off / in play — because the AF live feed can't match those by
      // id, so THIS re-sync is the only thing that flips them
      // SCHEDULED→LIVE→FINISHED.
      const futureCount = await prisma.fixture.count({
        where: {
          leagueId: lg.id,
          status: 'SCHEDULED',
          matchDate: { gte: new Date() },
        },
      })
      const fdActionCount = await prisma.fixture.count({
        where: {
          leagueId: lg.id,
          apiId: { lt: 0 },
          OR: [
            { status: { in: ['LIVE', 'HALFTIME'] } },
            {
              status: 'SCHEDULED',
              matchDate: {
                gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
                lte: new Date(Date.now() + 15 * 60 * 1000),
              },
            },
          ],
        },
      })
      if (futureCount === 0 || fdActionCount > 0) {
        try {
          const fd = await this.syncActiveLeagueFromFD(lg)
          created += fd.created
          updated += fd.updated
          if (fd.created + fd.updated > 0) {
            logger.info(
              { league: lg.name, ...fd },
              'Active-season: filled from Football-Data fallback'
            )
          } else {
            errors.push(`${lg.name} (FD): no rows ingested`)
          }
        } catch (e) {
          errors.push(
            `${lg.name} (FD): ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    }

    await cache.clear('*fixtures:*').catch(() => undefined)
    logger.info(
      { leagues: active.length, created, updated, errors },
      'Active-season sync completed'
    )
    return { leagues: active.length, created, updated, errors }
  }

  // Sync standings from Football-Data.org into Standing model
  async syncStandings() {
    const competitionCodes = ['PL', 'PD', 'BL1', 'SA', 'FL1']
    const season = new Date().getFullYear()
    let totalSynced = 0

    for (const code of competitionCodes) {
      try {
        const { footballDataClient } = await import('./football-data')
        const response = await footballDataClient.getStandings(code)
        const table = response.standings?.[0]?.table || []

        if (table.length === 0) continue

        // Find or skip league
        const league = await prisma.league.findFirst({
          where: {
            name: {
              contains: response.competition?.name || code,
              mode: 'insensitive',
            },
          },
        })

        if (!league) {
          logger.debug({ code }, 'League not found in DB for standings sync')
          continue
        }

        for (const entry of table) {
          const team = await prisma.team.findFirst({
            where: {
              OR: [
                { apiId: entry.team?.id || 0 },
                {
                  name: { equals: entry.team?.name || '', mode: 'insensitive' },
                },
              ],
            },
          })

          if (!team) continue

          await prisma.standing.upsert({
            where: {
              leagueId_teamId_season: {
                leagueId: league.id,
                teamId: team.id,
                season,
              },
            },
            update: {
              position: entry.position || 0,
              played: entry.playedGames || 0,
              won: entry.won || 0,
              drawn: entry.draw || 0,
              lost: entry.lost || 0,
              goalsFor: entry.goalsFor || 0,
              goalsAgainst: entry.goalsAgainst || 0,
              goalDifference: entry.goalDifference || 0,
              points: entry.points || 0,
              form: entry.form || null,
            },
            create: {
              leagueId: league.id,
              teamId: team.id,
              season,
              position: entry.position || 0,
              played: entry.playedGames || 0,
              won: entry.won || 0,
              drawn: entry.draw || 0,
              lost: entry.lost || 0,
              goalsFor: entry.goalsFor || 0,
              goalsAgainst: entry.goalsAgainst || 0,
              goalDifference: entry.goalDifference || 0,
              points: entry.points || 0,
              form: entry.form || null,
            },
          })
          totalSynced++
        }

        logger.info(
          { code, count: table.length },
          `Synced standings for ${code}`
        )
      } catch (error) {
        logger.error({ error, code }, `Failed to sync standings for ${code}`)
      }
    }

    // Clear standings cache
    await cache.clear('stats:standings:*')

    logger.info({ totalSynced }, 'Standings sync complete')
    return { synced: totalSynced }
  }

  // Helper: Map API status to our enum
  private mapStatus(apiStatus: string): any {
    const statusMap: Record<string, string> = {
      TBD: 'SCHEDULED',
      NS: 'SCHEDULED',
      '1H': 'LIVE',
      HT: 'HALFTIME',
      '2H': 'LIVE',
      ET: 'LIVE',
      P: 'LIVE',
      FT: 'FINISHED',
      AET: 'FINISHED',
      PEN: 'FINISHED',
      PST: 'POSTPONED',
      CANC: 'CANCELLED',
      ABD: 'CANCELLED',
      AWD: 'FINISHED',
      WO: 'FINISHED',
    }

    return statusMap[apiStatus] || 'SCHEDULED'
  }
}

export const fixtureService = new FixtureService()
