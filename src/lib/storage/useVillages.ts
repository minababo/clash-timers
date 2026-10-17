import { useSyncExternalStore } from 'react'
import { villageStorage, type VillageStorage } from './villageStorage'

/** Saved villages, parsed, plus the actions to change them. Re-renders whenever they change. */
export function useVillages(storage: VillageStorage = villageStorage) {
  const villages = useSyncExternalStore(storage.subscribe, storage.loadVillages)
  return {
    villages,
    upsertVillage: storage.upsertVillage,
    removeVillage: storage.removeVillage,
    renameVillage: storage.renameVillage,
  }
}
