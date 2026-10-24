import type { UpgradeCategory, Village } from './parser'

export const VILLAGE_LABELS: Readonly<Record<Village, string>> = {
  home: 'Home Village',
  builder: 'Builder Base',
}

const HOME_CATEGORY_LABELS: Readonly<Record<UpgradeCategory, string>> = {
  building: 'Builder',
  hero: 'Hero',
  lab: 'Laboratory',
  pet: 'Pet House',
}

const CATEGORY_LABELS: Readonly<Record<Village, Partial<Record<UpgradeCategory, string>>>> = {
  home: HOME_CATEGORY_LABELS,
  builder: { building: 'Builder', hero: 'Hero', lab: 'Star Laboratory' },
}

/** A saved village's display name: its nickname, or the player tag if it has none. */
export function getVillageName(village: { tag: string; nickname: string | null }): string {
  return village.nickname ?? village.tag
}

export function getCategoryLabel(village: Village, category: UpgradeCategory): string {
  // Builder Base has no Pet House; fall back to the home label if an export ever has one.
  return CATEGORY_LABELS[village][category] ?? HOME_CATEGORY_LABELS[category]
}

/**
 * The export's `lvl` is the current level, so a running upgrade shows "Lv 9 → 10" and a finished
 * one shows its new level, "Lv 10".
 */
export function formatLevel(level: number, isReady: boolean): string {
  return isReady ? `Lv ${level + 1}` : `Lv ${level} → ${level + 1}`
}
