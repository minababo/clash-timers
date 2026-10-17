import { useId, useState, type FormEvent } from 'react'
import { getVillageName } from '../lib/labels'
import type { ParsedVillage } from '../lib/storage'
import { useNow } from '../lib/time'
import { BackButton } from './BackButton'
import {
  DANGER_BUTTON,
  PRIMARY_BUTTON,
  QUIET_DANGER_BUTTON,
  SECONDARY_BUTTON,
} from './buttonStyles'
import { UpgradeList } from './UpgradeList'
import { UpgradeSummary } from './UpgradeSummary'

interface VillageViewProps {
  village: ParsedVillage
  /** A one-off message, e.g. "Updated Main", shown above the village. */
  notice: string | null
  onBack: () => void
  onUpdate: () => void
  onRename: (nickname: string) => void
  onDelete: () => void
}

export function VillageView({
  village,
  notice,
  onBack,
  onUpdate,
  onRename,
  onDelete,
}: VillageViewProps) {
  const now = useNow()
  const [isRenaming, setIsRenaming] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const name = getVillageName(village)

  return (
    <div className="space-y-4">
      <BackButton label="Villages" onClick={onBack} />

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}

      {isRenaming ? (
        <RenameForm
          village={village}
          onSave={(nickname) => {
            onRename(nickname)
            setIsRenaming(false)
          }}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-white">{name}</h2>
            {village.nickname && (
              <p className="truncate font-mono text-sm text-slate-400">{village.tag}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            aria-label={`Rename ${name}`}
            className={`${SECONDARY_BUTTON} shrink-0 text-sm`}
          >
            Rename
          </button>
        </div>
      )}

      <UpgradeSummary data={village.data} now={now} />
      <UpgradeList upgrades={village.data.upgrades} now={now} />

      <div className="space-y-3 pt-2">
        <button type="button" onClick={onUpdate} className={`${SECONDARY_BUTTON} w-full`}>
          Update this village
        </button>

        {isConfirmingDelete ? (
          <div
            role="group"
            aria-labelledby="confirm-delete"
            className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4"
          >
            <p id="confirm-delete" className="text-sm text-rose-100">
              Delete <span className="font-semibold">{name}</span> from this device? You can add it
              again by pasting a new export.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className={`${SECONDARY_BUTTON} flex-1`}
              >
                Cancel
              </button>
              <button type="button" onClick={onDelete} className={`${DANGER_BUTTON} flex-1`}>
                Yes, delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className={`${QUIET_DANGER_BUTTON} w-full`}
          >
            Delete village
          </button>
        )}
      </div>
    </div>
  )
}

interface RenameFormProps {
  village: ParsedVillage
  onSave: (nickname: string) => void
  onCancel: () => void
}

function RenameForm({ village, onSave, onCancel }: RenameFormProps) {
  const [value, setValue] = useState(village.nickname ?? '')
  const inputId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-200">
        Nickname
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
        placeholder={village.tag}
        maxLength={30}
        autoFocus
        autoComplete="off"
        className="block min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
      />
      <p className="text-xs text-slate-500">Leave empty to show the player tag.</p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className={`${SECONDARY_BUTTON} flex-1`}>
          Cancel
        </button>
        <button type="submit" className={`${PRIMARY_BUTTON} flex-1`}>
          Save
        </button>
      </div>
    </form>
  )
}
