/**
 * Football scoreline semantics for knockout matches (extra time / penalties).
 *
 * A match decided on penalties is, for every result purpose (1X2, the model's
 * pick, the displayed scoreline), a DRAW at the score standing when the whistle
 * blew — the shootout only decides who advances, it is NOT part of the score.
 *
 * Providers disagree on how they report this:
 *  - Football-Data.org: `score.fullTime` is the RUNNING score and, once the
 *    shootout is played, it INCLUDES the shootout kicks (e.g. 4-5). The real
 *    on-pitch result lives in `score.regularTime` (after 90'). `score.duration`
 *    is REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT.
 *  - API-Football: `goals` is already the after-extra-time score EXCLUDING the
 *    shootout; the shootout tally is in `score.penalty`.
 *
 * Storing `fullTime` verbatim made a 1-1 (pens 4-5) match look like a 4-5
 * regulation result — wrong scoreline everywhere and a nonsensical post-match
 * read. These helpers normalise both providers to the on-pitch scoreline plus
 * the shootout tally kept separately.
 */

export interface Shootout {
  homePens: number
  awayPens: number
  winner: 'home' | 'away'
}

export interface NormalizedScore {
  /** On-pitch scoreline the 1X2 result is based on (excludes the shootout). */
  homeScore: number | null
  awayScore: number | null
  /** Penalty shootout tally + who advanced, when the match went to penalties. */
  shootout: Shootout | null
  /** True when the match was decided in extra time (no shootout). */
  decidedInExtraTime: boolean
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** Normalise a Football-Data.org `score` node. */
export function parseFootballDataScore(score: unknown): NormalizedScore {
  const s = (score ?? {}) as {
    duration?: string
    fullTime?: { home?: unknown; away?: unknown }
    regularTime?: { home?: unknown; away?: unknown }
  }
  const duration = String(s.duration ?? 'REGULAR').toUpperCase()
  const ftH = num(s.fullTime?.home)
  const ftA = num(s.fullTime?.away)
  const regH = num(s.regularTime?.home)
  const regA = num(s.regularTime?.away)
  const wentToPens =
    duration === 'PENALTY_SHOOTOUT' || duration === 'PENALTIES'

  if (wentToPens) {
    // On-pitch score = after-90 result (regularTime). fullTime carries the
    // shootout added on top, so the shootout tally is fullTime − regularTime.
    const homeScore = regH ?? ftH
    const awayScore = regA ?? ftA
    let shootout: Shootout | null = null
    if (regH != null && regA != null && ftH != null && ftA != null) {
      const homePens = ftH - regH
      const awayPens = ftA - regA
      if (homePens >= 0 && awayPens >= 0 && homePens !== awayPens) {
        shootout = {
          homePens,
          awayPens,
          winner: homePens > awayPens ? 'home' : 'away',
        }
      }
    }
    return { homeScore, awayScore, shootout, decidedInExtraTime: false }
  }

  return {
    homeScore: ftH,
    awayScore: ftA,
    shootout: null,
    decidedInExtraTime: duration === 'EXTRA_TIME',
  }
}

/** Normalise an API-Football fixture entry (`goals` + `score.penalty`). */
export function parseApiFootballScore(apiFixture: unknown): NormalizedScore {
  const f = (apiFixture ?? {}) as {
    goals?: { home?: unknown; away?: unknown }
    score?: { penalty?: { home?: unknown; away?: unknown } }
    fixture?: { status?: { short?: string } }
  }
  // `goals` already excludes the shootout — it's the on-pitch scoreline.
  const homeScore = num(f.goals?.home)
  const awayScore = num(f.goals?.away)
  const penH = num(f.score?.penalty?.home)
  const penA = num(f.score?.penalty?.away)
  const short = String(f.fixture?.status?.short ?? '').toUpperCase()
  let shootout: Shootout | null = null
  if (penH != null && penA != null && penH !== penA) {
    shootout = {
      homePens: penH,
      awayPens: penA,
      winner: penH > penA ? 'home' : 'away',
    }
  }
  return {
    homeScore,
    awayScore,
    shootout,
    decidedInExtraTime: short === 'AET' && shootout == null,
  }
}
