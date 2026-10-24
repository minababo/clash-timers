import { useEffect } from 'react'
import { hasUpgradeName } from '../names'
import type { Upgrade } from '../parser'
import { reportUnknownUpgrade } from './monitoring'

/** Reports every upgrade in the list whose ID has no known name (deduplicated per page load). */
export function useReportUnknownUpgrades(upgrades: readonly Upgrade[]): void {
  useEffect(() => {
    for (const upgrade of upgrades) {
      if (!hasUpgradeName(upgrade.dataId, upgrade.section)) {
        reportUnknownUpgrade(upgrade.section, upgrade.dataId)
      }
    }
  }, [upgrades])
}
