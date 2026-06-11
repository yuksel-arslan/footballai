// Cross-provider team-name resolution. Fixtures shown on the site can come
// from Football-Data while our stored history uses API-Football ids/names, so
// numeric ids don't line up across providers — names are the reliable key.

const TEAM_NAME_ALIASES: Record<string, string> = {
  'south korea': 'korea republic',
  'north korea': 'korea dpr',
  'ivory coast': 'cote divoire',
  czechia: 'czech republic',
  usa: 'united states',
  'united states of america': 'united states',
  iran: 'ir iran',
  china: 'china pr',
  'cape verde': 'cabo verde',
  turkiye: 'turkey',
  'bosnia and herzegovina': 'bosnia',
  'dr congo': 'congo dr',
}

export function normalizeTeam(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalized forms an input name might match in the pool (incl. aliases). */
export function nameCandidates(name: string): string[] {
  const norm = normalizeTeam(name)
  const out = new Set<string>([norm])
  const aliased = TEAM_NAME_ALIASES[norm]
  if (aliased) out.add(aliased)
  for (const [k, v] of Object.entries(TEAM_NAME_ALIASES)) {
    if (v === norm) out.add(k)
  }
  return [...out]
}

/**
 * Resolve a team name to a DB team id using a preloaded {id,name} list.
 * Matches on diacritic-insensitive normalized name + alias map.
 */
export function resolveTeamIdByName(
  name: string,
  teams: { id: number; name: string }[]
): number | null {
  const cands = new Set(nameCandidates(name))
  for (const t of teams) {
    if (cands.has(normalizeTeam(t.name))) return t.id
  }
  return null
}
