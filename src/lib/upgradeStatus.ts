import type { Upgrade, VillageExport } from './parser'

export interface UpgradeStatus {
  /** The running upgrade that finishes soonest, if any. */
  next: Upgrade | undefined
  readyCount: number
}

export function getUpgradeStatus(upgrades: readonly Upgrade[], now: number): UpgradeStatus {
  let next: Upgrade | undefined
  let readyCount = 0
  for (const upgrade of upgrades) {
    if (upgrade.finishesAt <= now) {
      readyCount++
    } else if (!next || upgrade.finishesAt < next.finishesAt) {
      next = upgrade
    }
  }
  return { next, readyCount }
}

/**
 * Orders villages for the home screen: those with something ready first, then by the soonest
 * running upgrade. Villages with nothing running go last. Ties fall back to the tag.
 */
export function sortVillagesByStatus<T extends { data: VillageExport }>(
  villages: readonly T[],
  now: number,
): T[] {
  return villages
    .map((village) => ({ village, status: getUpgradeStatus(village.data.upgrades, now) }))
    .sort((a, b) => {
      const aReady = a.status.readyCount > 0
      const bReady = b.status.readyCount > 0
      if (aReady !== bReady) return aReady ? -1 : 1

      const aNext = a.status.next?.finishesAt ?? Number.POSITIVE_INFINITY
      const bNext = b.status.next?.finishesAt ?? Number.POSITIVE_INFINITY
      if (aNext !== bNext) return aNext < bNext ? -1 : 1

      return a.village.data.tag.localeCompare(b.village.data.tag)
    })
    .map(({ village }) => village)
}
