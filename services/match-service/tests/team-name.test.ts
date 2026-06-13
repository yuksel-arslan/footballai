import { describe, it, expect } from 'vitest'
import { normalizeTeamName, teamNameVariants } from '../src/lib/team-name'

/**
 * Guards the report's "no empty team data" fix: cross-provider name variants
 * must overlap so history mined under one spelling is found under another
 * (Türkiye↔Turkey, South Korea↔Korea Republic, …).
 */
describe('team-name resolution (report data fix)', () => {
  it('normalizes accents and case', () => {
    expect(normalizeTeamName('Türkiye')).toBe('turkiye')
    expect(normalizeTeamName('  Korea  Republic ')).toBe('korea republic')
    expect(normalizeTeamName('Côte d’Ivoire')).toBe('cote divoire')
  })

  it('maps a spelling to its canonical alias', () => {
    expect(teamNameVariants('Türkiye')).toContain('turkey')
    expect(teamNameVariants('South Korea')).toContain('korea republic')
    expect(teamNameVariants('Czechia')).toContain('czech republic')
  })

  it('also yields the reverse alias spelling', () => {
    // Fixture says "Turkey"; archive may hold "turkiye" — must be reachable.
    expect(teamNameVariants('Turkey')).toContain('turkiye')
    expect(teamNameVariants('Korea Republic')).toContain('south korea')
  })

  it('two spellings of the same team share a variant (so mining matches)', () => {
    const a = new Set(teamNameVariants('Türkiye').map(normalizeTeamName))
    const b = new Set(teamNameVariants('Turkey').map(normalizeTeamName))
    const overlap = [...a].some((x) => b.has(x))
    expect(overlap).toBe(true)
  })

  it('always includes the original (trimmed) name', () => {
    expect(teamNameVariants('Australia')).toContain('Australia')
    expect(teamNameVariants(' Brazil ')).toContain('Brazil')
  })
})
