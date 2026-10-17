import { describe, expect, it } from 'vitest'
import { parseVillageExport } from './parseVillageExport'

// TODO: add the fixture-based tests once src/lib/__fixtures__/village-export.json is committed.

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
