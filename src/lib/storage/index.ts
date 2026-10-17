export {
  createVillageStorage,
  loadVillages,
  removeVillage,
  renameVillage,
  STORAGE_KEY,
  upsertVillage,
  villageStorage,
} from './villageStorage'
export type {
  KeyValueStorage,
  ParsedVillage,
  SavedVillage,
  UpsertResult,
  VillageStorage,
} from './villageStorage'
export { useVillages } from './useVillages'
