import { formatLevel, getCategoryLabel } from '../lib/labels'
import { getUpgradeName } from '../lib/names'
import type { VillageExport } from '../lib/parser'
import { formatAgo, formatDuration, formatFinishTime, secondsUntil } from '../lib/time'
import { getUpgradeStatus } from '../lib/upgradeStatus'

interface UpgradeSummaryProps {
  data: VillageExport
  now: number
}

export function UpgradeSummary({ data, now }: UpgradeSummaryProps) {
  const { next, readyCount } = getUpgradeStatus(data.upgrades, now)

  return (
    <section
      aria-label="Summary"
      className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20"
    >
      <p className="text-xs text-slate-400 tabular-nums">
        {formatAgo('Exported', data.exportedAt, now)}
      </p>

      <div className="mt-3 border-t border-slate-800 pt-3">
        {next ? (
          <>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Next to finish
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">
                  {getCategoryLabel(next.village, next.category)}
                </p>
                <p className="truncate text-sm text-slate-400">
                  {getUpgradeName(next.dataId, next.section)} · {formatLevel(next.level, false)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-3xl font-bold text-amber-300 tabular-nums">
                  {formatDuration(secondsUntil(next.finishesAt, now))}
                </p>
                <p className="text-xs text-slate-400 tabular-nums">
                  {formatFinishTime(next.finishesAt, now)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-300">
            {data.upgrades.length === 0
              ? 'Nothing is upgrading in this export.'
              : 'All upgrades are ready.'}
          </p>
        )}

        {next && readyCount > 0 && (
          <p className="mt-3 text-sm font-medium text-emerald-300">
            {readyCount} {readyCount === 1 ? 'upgrade is' : 'upgrades are'} ready
          </p>
        )}
      </div>
    </section>
  )
}
