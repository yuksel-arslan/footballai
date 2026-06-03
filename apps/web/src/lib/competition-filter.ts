import { LEAGUES, LEAGUE_ALIASES } from '@/lib/reference-data'

function aliasesFor(code: string): string[] {
  const a = LEAGUE_ALIASES[code]
  if (a && a.length) return a
  const name = LEAGUES[code]?.name?.toLowerCase()
  return name ? [name] : []
}

/** Accepted lowercased league-name aliases for the selected codes. */
export function selectedLeagueNames(selected: string[]): Set<string> {
  const s = new Set<string>()
  for (const code of selected) for (const a of aliasesFor(code)) s.add(a)
  return s
}

/**
 * Filter fixtures to those whose league matches a selected competition.
 * An empty selection means "no filter" (show everything) so the UI is never
 * blank when the user has toggled all off.
 */
export function filterFixturesByCompetitions<
  T extends { league?: { name?: string } },
>(fixtures: T[], selected: string[]): T[] {
  if (!selected.length) return fixtures
  const names = selectedLeagueNames(selected)
  return fixtures.filter((f) => {
    const n = (f.league?.name ?? '').toLowerCase().trim()
    if (!n) return false
    if (names.has(n)) return true
    for (const a of names) if (n.includes(a) || a.includes(n)) return true
    return false
  })
}
