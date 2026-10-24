import { describe, expect, it } from 'vitest'
import { formatLevel, getCategoryLabel, VILLAGE_LABELS } from './labels'

describe('labels', () => {
  it('labels villages', () => {
    expect(VILLAGE_LABELS).toEqual({ home: 'Home Village', builder: 'Builder Base' })
  })

  it('labels categories per village', () => {
    expect(getCategoryLabel('home', 'building')).toBe('Builder')
    expect(getCategoryLabel('home', 'hero')).toBe('Hero')
    expect(getCategoryLabel('home', 'lab')).toBe('Laboratory')
    expect(getCategoryLabel('home', 'pet')).toBe('Pet House')
    expect(getCategoryLabel('builder', 'building')).toBe('Builder')
    expect(getCategoryLabel('builder', 'hero')).toBe('Hero')
    expect(getCategoryLabel('builder', 'lab')).toBe('Star Laboratory')
  })
})

describe('formatLevel', () => {
  it('shows the current and next level while upgrading', () => {
    expect(formatLevel(9, false)).toBe('Lv 9 → 10')
    expect(formatLevel(1, false)).toBe('Lv 1 → 2')
  })

  it('shows the new level once ready', () => {
    expect(formatLevel(9, true)).toBe('Lv 10')
  })
})
