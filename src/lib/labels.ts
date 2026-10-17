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

export function getCategoryLabel(village: Village, category: UpgradeCategory): string {
  // Builder Base has no Pet House; fall back to the home label if an export ever has one.
  return CATEGORY_LABELS[village][category] ?? HOME_CATEGORY_LABELS[category]
}
