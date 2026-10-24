import { describe, expect, it } from 'vitest'
import { formatAgo, formatDuration, secondsUntil } from './formatDuration'

describe('formatDuration', () => {
  it.each([
    [3 * 86_400 + 4 * 3_600 + 59 * 60, '3d 4h'],
    [4 * 3_600 + 12 * 60 + 59, '4h 12m'],
    [12 * 60 + 30, '12m 30s'],
    [45, '45s'],
    [1, '1s'],
    [37_745, '10h 29m'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })

  it('drops a zero second unit', () => {
    expect(formatDuration(2 * 86_400)).toBe('2d')
    expect(formatDuration(2 * 3_600 + 30)).toBe('2h')
    expect(formatDuration(60)).toBe('1m')
  })

  it('ignores fractional seconds', () => {
    expect(formatDuration(45.9)).toBe('45s')
  })

  it.each([0, -1, -3_600, 0.5, Number.NaN])('returns Ready for %s', (seconds) => {
    expect(formatDuration(seconds)).toBe('Ready')
  })
})

describe('secondsUntil', () => {
  it('rounds partial seconds up', () => {
    expect(secondsUntil(10_000, 9_001)).toBe(1)
    expect(secondsUntil(10_000, 10_000)).toBe(0)
    expect(secondsUntil(10_000, 12_000)).toBe(-2)
  })
})

describe('formatAgo', () => {
  it('formats elapsed time with a prefix', () => {
    expect(formatAgo('Updated', 0, 2 * 3_600_000 + 5 * 60_000)).toBe('Updated 2h 5m ago')
  })

  it('says "just now" within the first second or for a time in the future', () => {
    expect(formatAgo('Exported', 1_000, 1_999)).toBe('Exported just now')
    expect(formatAgo('Exported', 5_000, 1_000)).toBe('Exported just now')
  })
})
