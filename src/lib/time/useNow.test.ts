import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_000_000 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current time and updates on the interval', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current).toBe(1_000_000)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe(1_001_000)

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current).toBe(1_004_000)
  })

  it('respects a custom interval', () => {
    const { result } = renderHook(() => useNow(5000))

    act(() => vi.advanceTimersByTime(4999))
    expect(result.current).toBe(1_000_000)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(1_005_000)
  })

  it('clears its interval on unmount', () => {
    const { unmount } = renderHook(() => useNow())
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
