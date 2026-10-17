import { getVillageName } from '../lib/labels'
import type { ParsedVillage } from '../lib/storage'
import { formatAgo, formatDuration, secondsUntil, useNow } from '../lib/time'
import { getUpgradeStatus, sortVillagesByStatus } from '../lib/upgradeStatus'
import { PRIMARY_BUTTON } from './buttonStyles'

interface VillageListProps {
  villages: readonly ParsedVillage[]
  onOpen: (tag: string) => void
  onAdd: () => void
}

export function VillageList({ villages, onOpen, onAdd }: VillageListProps) {
  const now = useNow()

  return (
    <div className="space-y-4">
      <section aria-labelledby="your-villages">
        <h2 id="your-villages" className="mb-2 px-1 text-base font-semibold text-slate-100">
          Your villages
        </h2>
        <ul className="space-y-2">
          {sortVillagesByStatus(villages, now).map((village) => (
            <VillageCard
              key={village.tag}
              village={village}
              now={now}
              onOpen={() => onOpen(village.tag)}
            />
          ))}
        </ul>
      </section>

      <button type="button" onClick={onAdd} className={`${PRIMARY_BUTTON} w-full`}>
        Add or update village
      </button>
    </div>
  )
}

interface VillageCardProps {
  village: ParsedVillage
  now: number
  onOpen: () => void
}

function VillageCard({ village, now, onOpen }: VillageCardProps) {
  const { next, readyCount } = getUpgradeStatus(village.data.upgrades, now)
  const hasReady = readyCount > 0

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
          hasReady
            ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15'
            : 'border-slate-800 bg-slate-900 hover:bg-slate-800/70'
        }`}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-100">{getVillageName(village)}</p>
          {village.nickname && (
            <p className="truncate font-mono text-xs text-slate-400">{village.tag}</p>
          )}
          <p className="text-xs text-slate-500 tabular-nums">
            {formatAgo('Updated', village.data.exportedAt, now)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {next ? (
            <p className="text-lg font-semibold text-amber-300 tabular-nums">
              {formatDuration(secondsUntil(next.finishesAt, now))}
            </p>
          ) : (
            !hasReady && <p className="text-sm text-slate-400">Nothing upgrading</p>
          )}
          {hasReady && (
            <p className="text-sm font-medium text-emerald-300 tabular-nums">{readyCount} ready</p>
          )}
        </div>
      </button>
    </li>
  )
}
