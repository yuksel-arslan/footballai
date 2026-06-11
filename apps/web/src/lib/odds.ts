/**
 * Parse a bookmaker odds string into decimal odds (> 1).
 *
 * Bookmakers display odds in different formats; the value engine needs decimal.
 * Supported inputs:
 *   - Fractional (UK, e.g. William Hill): "8/5" → 2.60, "5/6" → 1.83,
 *     "1/5" → 1.20, "12/1" → 13.0. Decimal = a/b + 1.
 *   - "evens" / "evs" / "1/1" → 2.00
 *   - Decimal (e.g. Pinnacle): "2.60" → 2.60
 *
 * Returns null when the input can't be parsed into valid decimal odds (> 1).
 */
export function parseOdds(input: string | number | null | undefined): number | null {
  if (input == null) return null
  const raw = String(input).trim().toLowerCase().replace(',', '.')
  if (!raw) return null

  if (raw === 'evens' || raw === 'evs' || raw === 'even') return 2.0

  // Fractional "a/b"
  if (raw.includes('/')) {
    const [aStr, bStr] = raw.split('/')
    const a = Number(aStr)
    const b = Number(bStr)
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= 0) {
      return null
    }
    const dec = a / b + 1
    return dec > 1 ? round2(dec) : null
  }

  // Decimal
  const dec = Number(raw)
  if (!Number.isFinite(dec) || dec <= 1) return null
  return round2(dec)
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** True when the string parses to valid decimal odds (> 1). */
export function isValidOdds(input: string): boolean {
  return parseOdds(input) != null
}
