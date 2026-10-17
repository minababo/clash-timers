import { getCategoryLabel } from '../lib/labels'
import type { VillageExport } from '../lib/parser'
import { formatDuration, formatFinishTime, secondsUntil } from '../lib/time'

interface UpgradeSummaryProps {
  data: VillageExport
  now: number
}

export function UpgradeSummary({ data, now }: UpgradeSummaryProps) {
  const secondsSinceExport = Math.floor((now - data.exportedAt) / 1000)
  const exportedLabel =
    secondsSinceExport > 0
      ? `Exported ${formatDuration(secondsSinceExport)} ago`
      : 'Exported just now'

  const next = data.upgrades.find((upgrade) => upgrade.finishesAt > now)
  const readyCount = data.upgrades.filter((upgrade) => upgrade.finishesAt <= now).length

  return (
    <section
      aria-label="Summary"
      className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-base font-semibold text-slate-100">{data.tag}</p>
        <p className="text-xs text-slate-400 tabular-nums">{exportedLabel}</p>
      </div>

      <div className="mt-4 border-t border-slate-800 pt-4">
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
                  #{next.dataId} · Lv {next.level}
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
