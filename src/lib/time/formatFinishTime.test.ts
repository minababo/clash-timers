import { describe, expect, it } from 'vitest'
import { formatFinishTime } from './formatFinishTime'

const utc = { locale: 'en-GB', timeZone: 'UTC' }
// Thursday 15 October 2026, 10:00 UTC
const now = Date.UTC(2026, 9, 15, 10, 0)

describe('formatFinishTime', () => {
  it('shows "Today" for later the same day', () => {
    expect(formatFinishTime(Date.UTC(2026, 9, 15, 21, 55), now, utc)).toBe('Today 21:55')
  })

  it('shows "Tomorrow" for the next day', () => {
    expect(formatFinishTime(Date.UTC(2026, 9, 16, 4, 25), now, utc)).toBe('Tomorrow 04:25')
  })

  it('shows the weekday within the next week', () => {
    expect(formatFinishTime(Date.UTC(2026, 9, 17, 5, 25), now, utc)).toBe('Sat 05:25')
    expect(formatFinishTime(Date.UTC(2026, 9, 21, 5, 25), now, utc)).toBe('Wed 05:25')
  })

  it('adds the date a week or more out', () => {
    expect(formatFinishTime(Date.UTC(2026, 9, 23, 5, 25), now, utc)).toBe('Fri 23 Oct 05:25')
  })

  it('uses 24-hour time even in a 12-hour locale', () => {
    const result = formatFinishTime(Date.UTC(2026, 9, 15, 21, 5), now, {
      locale: 'en-US',
      timeZone: 'UTC',
    })
    expect(result).toBe('Today 21:05')
  })

  it('shows midnight as 00, not 24', () => {
    expect(formatFinishTime(Date.UTC(2026, 9, 16, 0, 5), now, utc)).toBe('Tomorrow 00:05')
  })

  it('works out the day in the given timezone', () => {
    // 23:00 Thursday in Tokyo; the finish is 01:00 Friday there but still Thursday in UTC.
    const tokyoNow = Date.UTC(2026, 9, 15, 14, 0)
    const finish = Date.UTC(2026, 9, 15, 16, 0)
    expect(formatFinishTime(finish, tokyoNow, { locale: 'en-GB', timeZone: 'Asia/Tokyo' })).toBe(
      'Tomorrow 01:00',
    )
    expect(formatFinishTime(finish, tokyoNow, utc)).toBe('Today 16:00')
  })
})
