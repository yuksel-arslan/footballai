import { prisma } from '@football-ai/database'

/**
 * International (national-team) competitions, API-Football league ids.
 * Tournament-only history is too thin to fit a rating model, so these share
 * one rating pool: 1 WC, 4 Euro, 5 Nations League, 6 Africa Cup, 7 Asian Cup,
 * 9 Copa America, 10 Friendlies, 29-34 WC qualifiers (per confederation).
 */
export const INTERNATIONAL_LEAGUE_API_IDS = [
  1, 4, 5, 6, 7, 9, 10, 29, 30, 31, 32, 33, 34,
]

/**
 * The public-list organization filter. The lists show ONLY the competitions an
 * admin has switched on (League.active) — a fully manual curation, controlled
 * from the admin panel (Lig & Turnuva Aktiflik Kontrolü). There is no automatic
 * season/tournament logic: what the admin picks is exactly what users see.
 *
 * Fails open (no filter) only when nothing is active at all, so a brand-new /
 * empty database isn't a blank app before anything has been curated.
 */
export async function activeOrgWhere(): Promise<Record<string, unknown>> {
  const activeCount = await prisma.league.count({ where: { active: true } })
  return activeCount > 0 ? { league: { active: true } } : {}
}
