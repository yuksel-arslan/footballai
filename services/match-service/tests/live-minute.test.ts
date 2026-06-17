import { describe, it, expect } from 'vitest'
import { estimateLiveMinute } from '../src/utils/live-minute'

/**
 * Guards the live-minute fix: when a provider gives no elapsed minute we
 * estimate it from kickoff, but the ~15-minute half-time break must be removed
 * so the second-half minute isn't inflated (the "shows 51' at 46'" bug).
 */
describe('estimateLiveMinute', () => {
  const now = Date.UTC(2026, 5, 15, 12, 0, 0)
  // kickoff `mins` of wall-clock ago
  const ago = (mins: number) => new Date(now - mins * 60000)

  it('tracks the first half one-to-one', () => {
    expect(estimateLiveMinute(ago(10), now)).toBe(10)
    expect(estimateLiveMinute(ago(45), now)).toBe(45)
  })

  it('never returns below 1 at kickoff', () => {
    expect(estimateLiveMinute(ago(0), now)).toBe(1)
  })

  it('holds at 45 through the half-time break', () => {
    expect(estimateLiveMinute(ago(50), now)).toBe(45)
    expect(estimateLiveMinute(ago(60), now)).toBe(45)
  })

  it('removes the 15-minute break in the second half', () => {
    // 61 minutes of wall-clock = 46th playing minute (the reported bug).
    expect(estimateLiveMinute(ago(61), now)).toBe(46)
    expect(estimateLiveMinute(ago(75), now)).toBe(60)
  })

  it('clamps to 90 (stoppage not reconstructable from kickoff)', () => {
    expect(estimateLiveMinute(ago(105), now)).toBe(90)
    expect(estimateLiveMinute(ago(130), now)).toBe(90)
  })
})
