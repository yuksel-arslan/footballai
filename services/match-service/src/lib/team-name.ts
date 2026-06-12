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
