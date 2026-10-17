import { describe, expect, it } from 'vitest'
import fixtureText from '../__fixtures__/village-export.json?raw'
import { parseVillageExport } from './parseVillageExport'
import type { VillageExport } from './types'

const FIXTURE_TIMESTAMP = 1792269773

function parseFixture(): VillageExport {
  const result = parseVillageExport(fixtureText)
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.data
}

describe('parseVillageExport with the village export fixture', () => {
  it('returns the tag and export time', () => {
    const result = parseVillageExport(fixtureText)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.tag).toBe('#G8QPYCL8Q')
    expect(result.data.exportedAt).toBe(1792269773000)
  })

  it('returns exactly 12 upgrades', () => {
    expect(parseFixture().upgrades).toHaveLength(12)
  })

  it('counts upgrades per village and category', () => {
    const counts: Record<string, number> = {}
    for (const { village, category } of parseFixture().upgrades) {
      const key = `${village}/${category}`
      counts[key] = (counts[key] ?? 0) + 1
    }
    expect(counts).toEqual({
      'home/building': 4,
      'home/hero': 2,
      'home/lab': 1,
      'home/pet': 1,
      'builder/building': 2,
      'builder/hero': 1,
      'builder/lab': 1,
    })
  })

  it('puts the soonest upgrade first', () => {
    const first = parseFixture().upgrades[0]
    expect(first.section).toBe('buildings')
    expect(first.dataId).toBe(1000003)
    expect(first.secondsRemaining).toBe(37745)
    expect(first.finishesAt).toBe((FIXTURE_TIMESTAMP + 37745) * 1000)
  })

  it('puts the latest upgrade last', () => {
    const last = parseFixture().upgrades.at(-1)
    expect(last?.section).toBe('buildings')
    expect(last?.dataId).toBe(1000072)
    expect(last?.secondsRemaining).toBe(443584)
  })

  it('sorts upgrades by finishesAt', () => {
    const finishTimes = parseFixture().upgrades.map((u) => u.finishesAt)
    expect(finishTimes).toEqual([...finishTimes].sort((a, b) => a - b))
  })

  it('gives every upgrade a unique id', () => {
    const ids = parseFixture().upgrades.map((u) => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('excludes helper_cooldown and clocktower_cooldown', () => {
    const { upgrades } = parseFixture()
    const sections = new Set(upgrades.map((u) => u.section))
    expect(sections.has('helpers')).toBe(false)
    expect(sections.has('boosts')).toBe(false)
    // helpers[0].helper_cooldown = 22209, boosts.clocktower_cooldown = 61664
    const seconds = upgrades.map((u) => u.secondsRemaining)
    expect(seconds).not.toContain(22209)
    expect(seconds).not.toContain(61664)
  })
})

const minimalExport = {
  tag: '#TEST',
  timestamp: 1_700_000_000,
  buildings: [
    { data: 1000001, lvl: 10, timer: 500 },
    { data: 1000001, lvl: 10, cnt: 3 },
    { data: 1000002, lvl: 4, timer: 100 },
  ],
  units2: [{ data: 4000031, lvl: 2, timer: 50 }],
  helper_cooldown: [{ data: 93000000, timer: 10 }],
  clocktower_cooldown: [{ data: 1000048, timer: 20 }],
  heroes: ['not an object', { lvl: 5, timer: 30 }, { data: 'x', timer: 30 }],
}

describe('parseVillageExport', () => {
  it('returns invalid_json for malformed JSON', () => {
    expect(parseVillageExport('{not json')).toEqual({ ok: false, error: 'invalid_json' })
  })

  it.each(['{}', '[]'])('returns not_village_export for %s', (input) => {
    expect(parseVillageExport(input)).toEqual({ ok: false, error: 'not_village_export' })
  })

  it('returns an empty upgrades array when nothing has a timer', () => {
    const result = parseVillageExport(
      JSON.stringify({ tag: '#TEST', timestamp: 1, buildings: [{ data: 1000001, lvl: 3 }] }),
    )
    expect(result).toEqual({ ok: true, data: { tag: '#TEST', exportedAt: 1000, upgrades: [] } })
  })

  it('parses JSON surrounded by whitespace', () => {
    const result = parseVillageExport(`\n  ${JSON.stringify(minimalExport)}  \t\n`)
    expect(result.ok).toBe(true)
  })

  it('keeps only items with a timer in mapped sections, sorted by finish time', () => {
    const result = parseVillageExport(JSON.stringify(minimalExport))
    if (!result.ok) throw new Error('expected ok')

    expect(result.data.tag).toBe('#TEST')
    expect(result.data.exportedAt).toBe(1_700_000_000_000)
    expect(result.data.upgrades).toEqual([
      {
        id: 'units2-4000031-0',
        dataId: 4000031,
        section: 'units2',
        village: 'builder',
        category: 'lab',
        level: 2,
        secondsRemaining: 50,
        finishesAt: (1_700_000_000 + 50) * 1000,
      },
      {
        id: 'buildings-1000002-2',
        dataId: 1000002,
        section: 'buildings',
        village: 'home',
        category: 'building',
        level: 4,
        secondsRemaining: 100,
        finishesAt: (1_700_000_000 + 100) * 1000,
      },
      {
        id: 'buildings-1000001-0',
        dataId: 1000001,
        section: 'buildings',
        village: 'home',
        category: 'building',
        level: 10,
        secondsRemaining: 500,
        finishesAt: (1_700_000_000 + 500) * 1000,
      },
    ])
  })
})
