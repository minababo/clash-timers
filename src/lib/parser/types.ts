export type Village = 'home' | 'builder'

export type UpgradeCategory = 'building' | 'hero' | 'lab' | 'pet'

export interface Upgrade {
  id: string
  dataId: number
  section: string
  village: Village
  category: UpgradeCategory
  level: number
  secondsRemaining: number
  /** ms epoch */
  finishesAt: number
}

export interface VillageExport {
  tag: string
  /** ms epoch */
  exportedAt: number
  upgrades: Upgrade[]
}

export type ParseResult =
  { ok: true; data: VillageExport } | { ok: false; error: 'invalid_json' | 'not_village_export' }
