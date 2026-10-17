import { describe, expect, it } from 'vitest'
import type { Upgrade, VillageExport } from './parser'
import { getUpgradeStatus, sortVillagesByStatus } from './upgradeStatus'

function upgrade(finishesAt: number): Upgrade {
  return {
    id: `buildings-1-${finishesAt}`,
    dataId: 1,
    section: 'buildings',
    village: 'home',
    category: 'building',
    level: 1,
    secondsRemaining: 0,
    finishesAt,
  }
}

function village(tag: string, finishTimes: number[]): { data: VillageExport } {
  return { data: { tag, exportedAt: 0, upgrades: finishTimes.map(upgrade) } }
}

describe('getUpgradeStatus', () => {
  it('finds the soonest running upgrade and counts finished ones', () => {
    const status = getUpgradeStatus([upgrade(500), upgrade(50), upgrade(300), upgrade(100)], 100)
    expect(status.next?.finishesAt).toBe(300)
    expect(status.readyCount).toBe(2)
  })

  it('handles no upgrades', () => {
    expect(getUpgradeStatus([], 0)).toEqual({ next: undefined, readyCount: 0 })
  })
})

describe('sortVillagesByStatus', () => {
  it('puts villages with something ready first, then soonest next upgrade, then idle', () => {
    const now = 1000
    const sorted = sortVillagesByStatus(
      [
        village('#IDLE', []),
        village('#LATER', [5000]),
        village('#READY_LATE', [500, 9000]),
        village('#SOON', [2000]),
        village('#READY_SOON', [900, 1500]),
        village('#ALL_READY', [10]),
      ],
      now,
    )
    expect(sorted.map((v) => v.data.tag)).toEqual([
      '#READY_SOON',
      '#READY_LATE',
      '#ALL_READY',
      '#SOON',
      '#LATER',
      '#IDLE',
    ])
  })
})
