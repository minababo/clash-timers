import { parseVillageExport, type ParseResult, type VillageExport } from '../parser'

export const STORAGE_KEY = 'clash-timers:v1'
const STORAGE_VERSION = 1

export interface SavedVillage {
  tag: string
  nickname: string | null
  /** The export text exactly as pasted; parsed on every read so parser fixes apply to old saves. */
  rawExport: string
  /** ms epoch */
  savedAt: number
}

export interface ParsedVillage extends SavedVillage {
  data: VillageExport
}

interface StoredData {
  version: typeof STORAGE_VERSION
  villages: SavedVillage[]
}

export type UpsertResult =
  { ok: true; village: ParsedVillage; updated: boolean } | Extract<ParseResult, { ok: false }>

/** The subset of the Web Storage API this module needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface VillageStorage {
  /** Returns the same array until the stored data changes, so it can back useSyncExternalStore. */
  loadVillages(): readonly ParsedVillage[]
  upsertVillage(rawExport: string): UpsertResult
  removeVillage(tag: string): void
  renameVillage(tag: string, nickname: string): void
  subscribe(listener: () => void): () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSavedVillage(value: unknown): value is SavedVillage {
  return (
    isRecord(value) &&
    typeof value.tag === 'string' &&
    (typeof value.nickname === 'string' || value.nickname === null) &&
    typeof value.rawExport === 'string' &&
    typeof value.savedAt === 'number'
  )
}

/** Corrupt JSON, the wrong shape or the wrong version all read as "nothing saved". */
function parseStoredVillages(raw: string | null): SavedVillage[] {
  if (raw === null) return []
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return []
  }
  if (!isRecord(json) || json.version !== STORAGE_VERSION || !Array.isArray(json.villages)) {
    return []
  }
  return json.villages.filter(isSavedVillage)
}

/**
 * Creates a village store backed by `getStorage()` (localStorage by default). If the storage
 * can't be reached or throws (e.g. Safari private mode, quota exceeded), it switches to an
 * in-memory copy for the rest of the session.
 */
export function createVillageStorage(
  getStorage: () => KeyValueStorage = () => window.localStorage,
): VillageStorage {
  let useMemory = false
  let memory: string | null = null
  let cache: { raw: string | null; villages: readonly ParsedVillage[] } | null = null
  const listeners = new Set<() => void>()

  function readRaw(): string | null {
    if (!useMemory) {
      try {
        return getStorage().getItem(STORAGE_KEY)
      } catch {
        useMemory = true
      }
    }
    return memory
  }

  function writeVillages(villages: SavedVillage[]) {
    const data: StoredData = { version: STORAGE_VERSION, villages }
    const raw = JSON.stringify(data)
    // Always kept current, so switching to memory mid-session loses nothing.
    memory = raw
    if (!useMemory) {
      try {
        getStorage().setItem(STORAGE_KEY, raw)
      } catch {
        useMemory = true
      }
    }
    listeners.forEach((listener) => listener())
  }

  function loadVillages(): readonly ParsedVillage[] {
    const raw = readRaw()
    if (cache?.raw === raw) return cache.villages

    const villages = parseStoredVillages(raw).flatMap((saved) => {
      const result = parseVillageExport(saved.rawExport)
      return result.ok ? [{ ...saved, data: result.data }] : []
    })
    cache = { raw, villages }
    return villages
  }

  function upsertVillage(rawExport: string): UpsertResult {
    const result = parseVillageExport(rawExport)
    if (!result.ok) return result

    const villages = parseStoredVillages(readRaw())
    const index = villages.findIndex((village) => village.tag === result.data.tag)
    const saved: SavedVillage = {
      tag: result.data.tag,
      nickname: index >= 0 ? villages[index].nickname : null,
      rawExport,
      savedAt: Date.now(),
    }
    if (index >= 0) {
      villages[index] = saved
    } else {
      villages.push(saved)
    }
    writeVillages(villages)

    return { ok: true, village: { ...saved, data: result.data }, updated: index >= 0 }
  }

  function removeVillage(tag: string) {
    const villages = parseStoredVillages(readRaw())
    const remaining = villages.filter((village) => village.tag !== tag)
    if (remaining.length !== villages.length) writeVillages(remaining)
  }

  function renameVillage(tag: string, nickname: string) {
    const trimmed = nickname.trim()
    const villages = parseStoredVillages(readRaw())
    if (!villages.some((village) => village.tag === tag)) return
    writeVillages(
      villages.map((village) =>
        village.tag === tag ? { ...village, nickname: trimmed === '' ? null : trimmed } : village,
      ),
    )
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    // Pick up changes made in other tabs.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) listener()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  return { loadVillages, upsertVillage, removeVillage, renameVillage, subscribe }
}

export const villageStorage = createVillageStorage()

export const { loadVillages, upsertVillage, removeVillage, renameVillage } = villageStorage
