/**
 * Canonical team-name key for cross-provider matching (Football-Data names
 * differ from API-Football's, e.g. "South Korea" vs "Korea Republic").
 * Mirror of the alias logic used by the prediction controller.
 */
const ALIASES: Record<string, string> = {
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

export const normalizeTeamName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const canonicalTeamName = (s: string): string => {
  const n = normalizeTeamName(s)
  return ALIASES[n] ?? n
}

/**
 * All name spellings a team's archived matches might be stored under, for
 * tolerant (case-insensitive) matching across providers — the original, its
 * normalized form, the canonical alias, and any alias key/value related to it
 * (e.g. "Türkiye" → ["Türkiye","turkiye","turkey"]; "South Korea" →
 * ["South Korea","south korea","korea republic"]).
 */
export const teamNameVariants = (s: string): string[] => {
  const norm = normalizeTeamName(s)
  const canon = ALIASES[norm] ?? norm
  const out = new Set<string>([s.trim(), norm, canon])
  for (const [k, v] of Object.entries(ALIASES)) {
    if (k === norm || v === norm || k === canon || v === canon) {
      out.add(k)
      out.add(v)
    }
  }
  return [...out].filter((x) => x.length > 0)
}
