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
 * Marquee national-team tournaments. These occupy the calendar precisely when
 * domestic/club seasons are OFF (June–July World Cup / Euro / Copa America,
 * January AFCON / Asian Cup), so when one is in season the whole product themes
 * around it. Nations League is deliberately excluded — it runs during club
 * season (international breaks), so it must not hide domestic leagues.
 */
const MARQUEE_INTL_API_IDS = new Set([
  1, // World Cup
  4, // Euro
  9, // Copa America
  6, // Africa Cup of Nations
  7, // Asian Cup
])

/**
 * The public-list organization filter. The lists only show competitions whose
 * season is open (League.active, calendar-driven). Additionally, while a
 * marquee national-team tournament is in season the lists show national-team
 * competitions ONLY — otherwise the domestic/club leagues that happen to run in
 * summer (MLS, Brasileirão, Nordic leagues, Copa Libertadores…) crowd out the
 * tournament everyone opened the app for. Fails open (no filter) when nothing
 * is active, so the lists are never empty by accident.
 */
export async function activeOrgWhere(): Promise<Record<string, unknown>> {
  const active = await prisma.league.findMany({
    where: { active: true },
    select: { apiId: true },
  })
  if (active.length === 0) return {}
  const marqueeActive = active.some((l) => MARQUEE_INTL_API_IDS.has(l.apiId))
  return marqueeActive
    ? {
        league: {
          active: true,
          apiId: { in: INTERNATIONAL_LEAGUE_API_IDS },
        },
      }
    : { league: { active: true } }
}
