/**
 * Estimate the playing minute of a live match from kickoff wall-clock time.
 *
 * Some providers (e.g. football-data.org) don't expose an elapsed minute, so we
 * derive it from how long ago kickoff was. But wall-clock time also runs through
 * the ~15-minute half-time break — counting that would inflate the second-half
 * minute (e.g. showing 61' when the match is really at 46'). We subtract a
 * standard 15-minute break once the match is clearly into the second half.
 *
 * Returns a minute in 1..90 (stoppage time isn't reconstructable from kickoff).
 */
export const HALFTIME_BREAK_MIN = 15

export function estimateLiveMinute(
  kickoff: Date,
  now: number = Date.now()
): number {
  const raw = Math.round((now - kickoff.getTime()) / 60000)
  if (raw <= 45) return Math.max(raw, 1) // first half
  if (raw <= 45 + HALFTIME_BREAK_MIN) return 45 // in/around the half-time break
  return Math.min(raw - HALFTIME_BREAK_MIN, 90) // second half, break removed
}
