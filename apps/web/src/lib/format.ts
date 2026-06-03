// Turkish date/time + prediction label helpers, shared across the redesign.
import type { Fixture, Prediction } from '@/lib/api'

const TZ = 'Europe/Istanbul'

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TZ,
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/** "Bugün" / "Yarın" / "3 Haz" relative to now (Istanbul). */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(x) // YYYY-MM-DD
  const today = fmt(new Date())
  const target = fmt(d)
  const tomorrow = fmt(new Date(Date.now() + 86400000))
  const yesterday = fmt(new Date(Date.now() - 86400000))
  if (target === today) return 'Bugün'
  if (target === tomorrow) return 'Yarın'
  if (target === yesterday) return 'Dün'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(d)
}

/** Long Turkish date for page headers, e.g. "3 Haziran · Cumartesi". */
export function formatLongDate(date: Date = new Date()): string {
  const day = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  }).format(date)
  const wd = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    timeZone: TZ,
  }).format(date)
  return `${day} · ${wd.charAt(0).toLocaleUpperCase('tr-TR')}${wd.slice(1)}`
}

export type PredictedOutcome = 'home' | 'draw' | 'away'

export function topOutcome(p: Prediction): {
  outcome: PredictedOutcome
  prob: number
} {
  const { homeWinProb: h, drawProb: d, awayWinProb: a } = p
  if (h >= d && h >= a) return { outcome: 'home', prob: h }
  if (a >= h && a >= d) return { outcome: 'away', prob: a }
  return { outcome: 'draw', prob: d }
}

/** Human pick label in Turkish from a fixture's first prediction. */
export function predictionPick(fixture: Fixture): {
  label: string
  prob: number
  confidence: number
} | null {
  const p = fixture.predictions?.[0]
  if (!p) return null
  const { outcome, prob } = topOutcome(p)
  const label =
    outcome === 'home'
      ? fixture.homeTeam.name
      : outcome === 'away'
        ? fixture.awayTeam.name
        : 'Beraberlik'
  return { label, prob, confidence: p.confidence }
}

/** 0–1 or 0–100 → integer percent. */
export function pct(n: number): number {
  const v = n <= 1 ? n * 100 : n
  return Math.round(v)
}
