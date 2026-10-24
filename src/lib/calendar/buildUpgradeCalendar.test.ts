import ICAL from 'ical.js'
import { describe, expect, it } from 'vitest'
import fixtureText from '../__fixtures__/village-export.json?raw'
import { parseVillageExport, type Upgrade } from '../parser'
import { buildUpgradeCalendar } from './buildUpgradeCalendar'

const EXPORTED_AT = 1792269773000
const TAG = '#G8QPYCL8Q'

function fixtureUpgrades(): Upgrade[] {
  const result = parseVillageExport(fixtureText)
  if (!result.ok) throw new Error('fixture should parse')
  return result.data.upgrades
}

function upgrade(overrides: Partial<Upgrade>): Upgrade {
  return {
    id: 'buildings-1000003-3',
    dataId: 1000003,
    section: 'buildings',
    village: 'home',
    category: 'building',
    level: 15,
    secondsRemaining: 100,
    finishesAt: EXPORTED_AT + 100_000,
    ...overrides,
  }
}

function parseEvents(ics: string) {
  const calendar = new ICAL.Component(ICAL.parse(ics))
  return calendar.getAllSubcomponents('vevent')
}

/** Splits into physical lines, keeping the terminator so CRLF can be checked. */
function physicalLines(ics: string): string[] {
  return ics.match(/[^\r\n]*(\r\n|\r|\n)|[^\r\n]+$/g) ?? []
}

/** Undoes RFC 5545 folding. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, '')
}

describe('buildUpgradeCalendar', () => {
  it('has the calendar header and footer', () => {
    const ics = buildUpgradeCalendar({
      villageLabel: 'Main',
      tag: TAG,
      upgrades: [],
      now: EXPORTED_AT,
    })
    const calendar = new ICAL.Component(ICAL.parse(ics))

    expect(calendar.getFirstPropertyValue('version')).toBe('2.0')
    expect(calendar.getFirstPropertyValue('prodid')).toBe('-//Clash Timers//Upgrade Calendar//EN')
    expect(calendar.getFirstPropertyValue('calscale')).toBe('GREGORIAN')
    expect(calendar.getFirstPropertyValue('method')).toBe('PUBLISH')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('gives zero events when nothing is running', () => {
    const ics = buildUpgradeCalendar({
      villageLabel: 'Main',
      tag: TAG,
      upgrades: [],
      now: EXPORTED_AT,
    })
    expect(parseEvents(ics)).toHaveLength(0)
  })

  it('skips upgrades that have already finished', () => {
    const ics = buildUpgradeCalendar({
      villageLabel: 'Main',
      tag: TAG,
      upgrades: [
        upgrade({ id: 'a', finishesAt: EXPORTED_AT - 1 }),
        upgrade({ id: 'b', finishesAt: EXPORTED_AT }),
        upgrade({ id: 'c', finishesAt: EXPORTED_AT + 1000 }),
      ],
      now: EXPORTED_AT,
    })

    const events = parseEvents(ics)
    expect(events).toHaveLength(1)
    expect(events[0].getFirstPropertyValue('uid')).toContain('-c-')
  })

  describe('with the fixture at its export time', () => {
    const upgrades = fixtureUpgrades()
    const ics = buildUpgradeCalendar({
      villageLabel: 'Main',
      tag: TAG,
      upgrades,
      now: EXPORTED_AT,
    })
    const events = parseEvents(ics)

    it('has one event per running upgrade', () => {
      expect(events).toHaveLength(12)
    })

    it('starts the first event when Elixir Storage finishes', () => {
      const first = new ICAL.Event(events[0])
      expect(first.summary).toBe('Main: Elixir Storage Lv 16 ready')
      expect(first.startDate.toJSDate().getTime()).toBe((1792269773 + 37745) * 1000)
      // UTC "Z" form: 2026-10-18 07:11:58 UTC, ending 5 minutes later.
      expect(ics).toContain('DTSTART:20261018T071158Z\r\nDTEND:20261018T071658Z\r\n')
      expect(first.endDate.toJSDate().getTime()).toBe((1792269773 + 37745) * 1000 + 5 * 60_000)
    })

    it('starts every event at its upgrade finish time', () => {
      const starts = events.map((e) => new ICAL.Event(e).startDate.toJSDate().getTime())
      expect(starts).toEqual(upgrades.map((u) => u.finishesAt))
    })

    it('names the target level in each summary', () => {
      const summaries = events.map((e) => new ICAL.Event(e).summary)
      expect(summaries).toContain('Main: Battle Copter Lv 29 ready')
      expect(summaries).toContain('Main: Frosty Lv 6 ready')
      expect(summaries).toContain('Main: Crusher Lv 8 ready')
      expect(summaries.every((s) => !s.includes('Unknown'))).toBe(true)
    })

    it('describes the category, village and player tag', () => {
      const description = new ICAL.Event(events[0]).description
      expect(description).toBe(
        'Builder\nHome Village\nPlayer tag: #G8QPYCL8Q\n\nTimes are based on your export. Re-export after using boosts.',
      )
      const copter = events
        .map((e) => new ICAL.Event(e))
        .find((e) => e.summary.includes('Battle Copter'))
      expect(copter?.description).toContain('Hero\nBuilder Base\n')
    })

    it('adds a display alarm at finish time to every event', () => {
      for (const event of events) {
        const alarm = event.getFirstSubcomponent('valarm')
        expect(alarm).not.toBeNull()
        expect(alarm?.getFirstPropertyValue('action')).toBe('DISPLAY')
        expect(alarm?.getFirstPropertyValue('description')).toBe(
          event.getFirstPropertyValue('summary'),
        )
        expect(alarm?.getFirstPropertyValue('trigger')?.toString()).toBe('PT0S')
      }
    })

    it('stamps every event with now', () => {
      for (const event of events) {
        const dtstamp = event.getFirstPropertyValue('dtstamp') as ICAL.Time
        expect(dtstamp.toJSDate().getTime()).toBe(EXPORTED_AT)
      }
    })

    it('gives every event a unique UID without "#"', () => {
      const uids = events.map((e) => String(e.getFirstPropertyValue('uid')))
      expect(new Set(uids).size).toBe(12)
      for (const uid of uids) {
        expect(uid).toMatch(/^G8QPYCL8Q-[A-Za-z0-9_-]+-\d+@clash-timers$/)
      }
    })

    it('ends every line with CRLF and keeps lines within 75 octets', () => {
      const encoder = new TextEncoder()
      for (const line of physicalLines(ics)) {
        expect(line.endsWith('\r\n'), JSON.stringify(line)).toBe(true)
        expect(encoder.encode(line.slice(0, -2)).length).toBeLessThanOrEqual(75)
      }
    })
  })

  it('builds the same UIDs from the same data', () => {
    const input = { villageLabel: 'Main', tag: TAG, upgrades: fixtureUpgrades(), now: EXPORTED_AT }
    const uids = (ics: string) => [...ics.matchAll(/^UID:(.*)$/gm)].map((m) => m[1])

    const first = uids(buildUpgradeCalendar(input))
    const second = uids(buildUpgradeCalendar({ ...input, now: EXPORTED_AT + 5_000 }))
    expect(first).toHaveLength(12)
    expect(second).toEqual(first)
  })

  it('escapes commas, semicolons, backslashes and newlines in text', () => {
    const ics = buildUpgradeCalendar({
      villageLabel: 'Main, alt; \\ two\nlines',
      tag: TAG,
      upgrades: [upgrade({})],
      now: EXPORTED_AT,
    })

    expect(unfold(ics)).toContain(
      'SUMMARY:Main\\, alt\\; \\\\ two\\nlines: Elixir Storage Lv 16 ready\r\n',
    )
    const event = new ICAL.Event(parseEvents(ics)[0])
    expect(event.summary).toBe('Main, alt; \\ two\nlines: Elixir Storage Lv 16 ready')
  })

  it('folds long lines, including multi-byte characters, without breaking them', () => {
    const longName = 'Ünïcödé 村 '.repeat(12).trim()
    const ics = buildUpgradeCalendar({
      villageLabel: longName,
      tag: TAG,
      upgrades: [upgrade({})],
      now: EXPORTED_AT,
    })

    const encoder = new TextEncoder()
    const lines = physicalLines(ics)
    expect(lines.some((line) => line.startsWith(' '))).toBe(true)
    for (const line of lines) {
      expect(line.endsWith('\r\n')).toBe(true)
      expect(encoder.encode(line.slice(0, -2)).length).toBeLessThanOrEqual(75)
    }
    expect(new ICAL.Event(parseEvents(ics)[0]).summary).toBe(
      `${longName}: Elixir Storage Lv 16 ready`,
    )
  })
})
