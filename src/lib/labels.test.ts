import { describe, expect, it } from 'vitest'
import { getCategoryLabel, VILLAGE_LABELS } from './labels'

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
