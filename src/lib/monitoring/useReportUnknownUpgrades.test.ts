import * as Sentry from '@sentry/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Upgrade } from '../parser'
import { useReportUnknownUpgrades } from './useReportUnknownUpgrades'

vi.mock('@sentry/react', () => ({
  isInitialized: vi.fn(() => true),
  captureMessage: vi.fn(),
}))

function upgrade(section: string, dataId: number): Upgrade {
  return {
    id: `${section}-${dataId}-0`,
    dataId,
    section,
    village: section.endsWith('2') ? 'builder' : 'home',
    category: 'building',
    level: 1,
    secondsRemaining: 60,
    finishesAt: 0,
  }
}

describe('useReportUnknownUpgrades', () => {
  it('reports only unknown IDs, once per section/ID pair, without the tag', () => {
    const upgrades = [
      upgrade('buildings', 1000003), // Elixir Storage: known
      upgrade('buildings', 1000777), // unknown
      upgrade('buildings', 1000777), // same unknown pair again
      upgrade('buildings2', 1000047), // unknown on Builder Base
    ]

    const { rerender } = renderHook(({ list }) => useReportUnknownUpgrades(list), {
      initialProps: { list: upgrades },
    })
    rerender({ list: [...upgrades] })

    const captureMessage = vi.mocked(Sentry.captureMessage)
    expect(captureMessage).toHaveBeenCalledTimes(2)
    expect(captureMessage.mock.calls.map(([, context]) => context)).toEqual([
      expect.objectContaining({ tags: { section: 'buildings', data_id: '1000777' } }),
      expect.objectContaining({ tags: { section: 'buildings2', data_id: '1000047' } }),
    ])
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain('#')
  })
})
