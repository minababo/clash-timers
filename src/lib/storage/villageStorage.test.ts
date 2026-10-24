import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixtureText from '../__fixtures__/village-export.json?raw'
import { createVillageStorage, STORAGE_KEY, type KeyValueStorage } from './villageStorage'

const TAG = '#G8QPYCL8Q'
const OTHER_TAG = '#OTHER'
const otherExport = fixtureText.replace(`"tag":"${TAG}"`, `"tag":"${OTHER_TAG}"`)
const laterExport = fixtureText.replace('"timestamp":1792269773', '"timestamp":1792280000')

function readStored(): unknown {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

describe('village storage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 1_800_000_000_000 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    expect(createVillageStorage().loadVillages()).toEqual([])
  })

  it('upsert adds a village and stores the raw export text', () => {
    const storage = createVillageStorage()
    const result = storage.upsertVillage(fixtureText)

    expect(result).toMatchObject({ ok: true, updated: false, village: { tag: TAG } })
    const [village] = storage.loadVillages()
    expect(village).toMatchObject({
      tag: TAG,
      nickname: null,
      rawExport: fixtureText,
      savedAt: 1_800_000_000_000,
    })
    expect(village.data.upgrades).toHaveLength(12)
    expect(readStored()).toEqual({
      version: 1,
      villages: [{ tag: TAG, nickname: null, rawExport: fixtureText, savedAt: 1_800_000_000_000 }],
    })
  })

  it('upsert with the same tag replaces the entry and keeps its nickname', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)
    storage.renameVillage(TAG, 'Main')

    const result = storage.upsertVillage(laterExport)

    expect(result).toMatchObject({ ok: true, updated: true, village: { nickname: 'Main' } })
    const villages = storage.loadVillages()
    expect(villages).toHaveLength(1)
    expect(villages[0]).toMatchObject({ tag: TAG, nickname: 'Main', rawExport: laterExport })
    expect(villages[0].data.exportedAt).toBe(1792280000000)
  })

  it('upsert with a different tag adds a second village', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)
    const result = storage.upsertVillage(otherExport)

    expect(result).toMatchObject({ ok: true, updated: false })
    expect(storage.loadVillages().map((v) => v.tag)).toEqual([TAG, OTHER_TAG])
  })

  it('upsert rejects text that is not an export and saves nothing', () => {
    const storage = createVillageStorage()

    expect(storage.upsertVillage('nope')).toEqual({ ok: false, error: 'invalid_json' })
    expect(storage.upsertVillage('{}')).toEqual({ ok: false, error: 'not_village_export' })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('removes a village by tag', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)
    storage.upsertVillage(otherExport)

    storage.removeVillage(TAG)

    expect(storage.loadVillages().map((v) => v.tag)).toEqual([OTHER_TAG])
  })

  it('renames a village, trimming the nickname', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)

    storage.renameVillage(TAG, '  Main account  ')

    expect(storage.loadVillages()[0].nickname).toBe('Main account')
  })

  it('renaming to an empty or blank string clears the nickname', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)
    storage.renameVillage(TAG, 'Main')

    storage.renameVillage(TAG, '')
    expect(storage.loadVillages()[0].nickname).toBeNull()

    storage.renameVillage(TAG, 'Main')
    storage.renameVillage(TAG, '   ')
    expect(storage.loadVillages()[0].nickname).toBeNull()
  })

  it('treats corrupt JSON as empty and can save over it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    const storage = createVillageStorage()

    expect(storage.loadVillages()).toEqual([])
    storage.upsertVillage(fixtureText)
    expect(storage.loadVillages()).toHaveLength(1)
  })

  it.each([
    ['a wrong version', { version: 2, villages: [] }],
    ['a missing version', { villages: [] }],
    ['villages that is not an array', { version: 1, villages: {} }],
    ['an array at the top level', []],
    ['a string', 'hello'],
  ])('treats %s as empty', (_, stored) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    expect(createVillageStorage().loadVillages()).toEqual([])
  })

  it('skips saved entries whose export no longer parses or that have the wrong shape', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        villages: [
          { tag: '#BROKEN', nickname: null, rawExport: 'not json', savedAt: 1 },
          { tag: '#BAD', nickname: 5, rawExport: fixtureText, savedAt: 1 },
          { tag: TAG, nickname: 'Main', rawExport: fixtureText, savedAt: 1 },
        ],
      }),
    )

    const villages = createVillageStorage().loadVillages()
    expect(villages.map((v) => v.tag)).toEqual([TAG])
  })

  it('keeps an unparseable entry when saving other changes', () => {
    const broken = { tag: '#BROKEN', nickname: null, rawExport: 'not json', savedAt: 1 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, villages: [broken] }))

    createVillageStorage().upsertVillage(fixtureText)

    expect(readStored()).toMatchObject({ villages: [broken, { tag: TAG }] })
  })

  it('falls back to memory when localStorage throws', () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    }
    const storage = createVillageStorage(() => throwing)

    expect(storage.loadVillages()).toEqual([])
    expect(storage.upsertVillage(fixtureText)).toMatchObject({ ok: true })
    storage.renameVillage(TAG, 'Main')
    expect(storage.loadVillages()).toMatchObject([{ tag: TAG, nickname: 'Main' }])
  })

  it('falls back to memory when localStorage itself is unavailable', () => {
    const storage = createVillageStorage(() => {
      throw new Error('localStorage is not available')
    })

    storage.upsertVillage(fixtureText)
    expect(storage.loadVillages()).toHaveLength(1)
  })

  it('keeps working in memory when a write fails part-way through the session', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    storage.upsertVillage(otherExport)

    expect(storage.loadVillages().map((v) => v.tag)).toEqual([TAG, OTHER_TAG])
  })

  it('returns the same array until the data changes', () => {
    const storage = createVillageStorage()
    storage.upsertVillage(fixtureText)

    const first = storage.loadVillages()
    expect(storage.loadVillages()).toBe(first)

    storage.renameVillage(TAG, 'Main')
    expect(storage.loadVillages()).not.toBe(first)
  })

  it('notifies subscribers on change until they unsubscribe', () => {
    const storage = createVillageStorage()
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    storage.upsertVillage(fixtureText)
    storage.renameVillage(TAG, 'Main')
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    storage.removeVillage(TAG)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
