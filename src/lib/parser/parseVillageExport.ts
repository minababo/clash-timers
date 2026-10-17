import type { ParseResult, Upgrade, UpgradeCategory, Village } from './types'

/** Export sections that can contain upgrades. Every other section is ignored. */
export const SECTION_MAP: Readonly<
  Record<string, { village: Village; category: UpgradeCategory }>
> = {
  buildings: { village: 'home', category: 'building' },
  heroes: { village: 'home', category: 'hero' },
  units: { village: 'home', category: 'lab' },
  spells: { village: 'home', category: 'lab' },
  siege_machines: { village: 'home', category: 'lab' },
  pets: { village: 'home', category: 'pet' },
  buildings2: { village: 'builder', category: 'building' },
  heroes2: { village: 'builder', category: 'hero' },
  units2: { village: 'builder', category: 'lab' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseVillageExport(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text.trim())
  } catch {
    return { ok: false, error: 'invalid_json' }
  }

  if (!isRecord(json) || typeof json.tag !== 'string' || !isFiniteNumber(json.timestamp)) {
    return { ok: false, error: 'not_village_export' }
  }

  const timestamp = json.timestamp
  const upgrades: Upgrade[] = []

  for (const [section, { village, category }] of Object.entries(SECTION_MAP)) {
    const items = json[section]
    if (!Array.isArray(items)) continue

    items.forEach((item: unknown, index) => {
      if (!isRecord(item) || !isFiniteNumber(item.data)) return
      if (!isFiniteNumber(item.timer) || item.timer <= 0) return

      upgrades.push({
        id: `${section}-${item.data}-${index}`,
        dataId: item.data,
        section,
        village,
        category,
        level: isFiniteNumber(item.lvl) ? item.lvl : 0,
        secondsRemaining: item.timer,
        finishesAt: (timestamp + item.timer) * 1000,
      })
    })
  }

  upgrades.sort((a, b) => a.finishesAt - b.finishesAt)

  return { ok: true, data: { tag: json.tag, exportedAt: timestamp * 1000, upgrades } }
}
