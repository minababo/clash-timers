import { describe, expect, it } from 'vitest'
import { calendarFilename } from './calendarFilename'

// Midday UTC, so the local date is 16 Oct 2026 in any timezone from UTC-11 to UTC+11.
const now = Date.UTC(2026, 9, 16, 12, 0)

describe('calendarFilename', () => {
  it('uses the name and the date', () => {
    expect(calendarFilename('Main', '#G8QPYCL8Q', now)).toBe('clash-timers-Main-2026-10-16.ics')
  })

  it('drops "#" from a tag', () => {
    expect(calendarFilename('#G8QPYCL8Q', '#G8QPYCL8Q', now)).toBe(
      'clash-timers-G8QPYCL8Q-2026-10-16.ics',
    )
  })

  it('turns spaces into dashes and removes unsafe characters', () => {
    expect(calendarFilename('  My main / alt: acc?  ', '#TAG', now)).toBe(
      'clash-timers-My-main-alt-acc-2026-10-16.ics',
    )
    expect(calendarFilename('a,b;c\\d"e', '#TAG', now)).toBe('clash-timers-abcde-2026-10-16.ics')
  })

  it('falls back to the tag when nothing safe is left', () => {
    expect(calendarFilename('村 🏰', '#G8QPYCL8Q', now)).toBe(
      'clash-timers-G8QPYCL8Q-2026-10-16.ics',
    )
  })

  it('falls back to "village" as a last resort', () => {
    expect(calendarFilename('🏰', '#', now)).toBe('clash-timers-village-2026-10-16.ics')
  })
})
