import { describe, expect, it } from 'vitest'
import fixtureText from '../__fixtures__/village-export.json?raw'
import { parseVillageExport } from '../parser'
import { getUpgradeName } from './getUpgradeName'

// Expected names are taken from clash-of-clans-data (the generator's source).
describe('getUpgradeName', () => {
  it.each([
    ['buildings', 1000000, 'Army Camp'],
    ['buildings', 1000001, 'Town Hall'],
    ['buildings', 1000003, 'Elixir Storage'],
    ['buildings', 1000007, 'Laboratory'],
    ['buildings', 1000015, "Builder's Hut"],
    ['buildings', 1000027, 'Inferno Tower'],
    ['buildings', 1000072, 'Spell Tower'],
  ])('names home building %s %i as %s', (section, id, name) => {
    expect(getUpgradeName(id, section)).toBe(name)
  })

  it.each([
    ['heroes', 28000000, 'Barbarian King'],
    ['heroes', 28000004, 'Royal Champion'],
    ['heroes', 28000006, 'Minion Prince'],
    ['heroes', 28000007, 'Dragon Duke'],
    ['units', 4000000, 'Barbarian'],
    ['units', 4000001, 'Archer'],
    ['spells', 26000000, 'Lightning Spell'],
    ['spells', 26000123, 'Angry Spell'],
    ['siege_machines', 4000051, 'Wall Wrecker'],
    ['siege_machines', 4000052, 'Battle Blimp'],
    ['pets', 73000000, 'L.A.S.S.I'],
    ['pets', 73000009, 'Frosty'],
  ])('names home %s %i as %s', (section, id, name) => {
    expect(getUpgradeName(id, section)).toBe(name)
  })

  it.each([
    ['buildings2', 1000034, 'Builder Hall'],
    ['buildings2', 1000046, 'Star Laboratory'],
    ['buildings2', 1000055, 'Crusher'],
    ['buildings2', 1000063, 'Lava Launcher'],
    ['heroes2', 28000003, 'Battle Machine'],
    ['heroes2', 28000005, 'Battle Copter'],
    ['units2', 4000031, 'Raged Barbarian'],
    ['units2', 4000033, 'Beta Minion'],
  ])('names Builder Base %s %i as %s', (section, id, name) => {
    expect(getUpgradeName(id, section)).toBe(name)
  })

  it('looks up Builder Base IDs only in Builder Base data', () => {
    // 1000042 is the Builder Base Army Camp; the home Army Camp is 1000000.
    expect(getUpgradeName(1000042, 'buildings2')).toBe('Army Camp')
    expect(getUpgradeName(1000042, 'buildings')).toBe('Unknown building #1000042')
    expect(getUpgradeName(1000055, 'buildings')).toBe('Unknown building #1000055')
    expect(getUpgradeName(1000000, 'buildings2')).toBe('Unknown building #1000000')
    expect(getUpgradeName(4000033, 'units')).toBe('Unknown troop #4000033')
  })

  it('names heroes, not their altars, in heroes2', () => {
    expect(getUpgradeName(28000005, 'heroes2')).toBe('Battle Copter')
    expect(getUpgradeName(1000080, 'buildings2')).toBe('Battle Copter Altar')
  })

  it.each([
    [1000999, 'buildings', 'Unknown building #1000999'],
    [1000047, 'buildings2', 'Unknown building #1000047'],
    [28999999, 'heroes', 'Unknown hero #28999999'],
    [4999999, 'units', 'Unknown troop #4999999'],
    [26999999, 'spells', 'Unknown spell #26999999'],
    [4999999, 'siege_machines', 'Unknown siege machine #4999999'],
    [73999999, 'pets', 'Unknown pet #73999999'],
    [1000000, 'traps', 'Unknown item #1000000'],
    [1000000, 'constructor', 'Unknown item #1000000'],
    [Number.NaN, 'buildings', 'Unknown building #NaN'],
  ])('falls back for unknown ID %s in %s', (id, section, expected) => {
    expect(getUpgradeName(id, section)).toBe(expected)
  })

  it('names every upgrade in the fixture', () => {
    const result = parseVillageExport(fixtureText)
    if (!result.ok) throw new Error('fixture should parse')

    expect(result.data.upgrades).toHaveLength(12)
    for (const upgrade of result.data.upgrades) {
      expect(getUpgradeName(upgrade.dataId, upgrade.section), upgrade.id).not.toMatch(/^Unknown/)
    }
  })
})
