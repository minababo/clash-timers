import { UPGRADE_NAMES, type NameGroup } from './upgradeNames.generated'

/**
 * Where to look up names for each export section the parser tracks, and the noun used when an
 * ID isn't in the data. Home and Builder Base IDs share ranges (e.g. 1000xxx buildings), so each
 * section only ever looks in its own village's group.
 */
const SECTION_NAMES: Readonly<Record<string, { group: NameGroup; noun: string }>> = {
  buildings: { group: 'home-building', noun: 'building' },
  heroes: { group: 'home-hero', noun: 'hero' },
  units: { group: 'home-troop', noun: 'troop' },
  spells: { group: 'home-spell', noun: 'spell' },
  siege_machines: { group: 'home-siege-machine', noun: 'siege machine' },
  pets: { group: 'home-pet', noun: 'pet' },
  buildings2: { group: 'builder-building', noun: 'building' },
  heroes2: { group: 'builder-hero', noun: 'hero' },
  units2: { group: 'builder-troop', noun: 'troop' },
}

/**
 * The in-game name for an upgrade, e.g. "Elixir Storage". Falls back to "Unknown building #1000999"
 * for IDs missing from the data. Never throws.
 */
export function getUpgradeName(dataId: number, section: string): string {
  const source = Object.hasOwn(SECTION_NAMES, section) ? SECTION_NAMES[section] : undefined
  const name = source ? UPGRADE_NAMES[source.group][dataId] : undefined
  return name ?? `Unknown ${source?.noun ?? 'item'} #${dataId}`
}
