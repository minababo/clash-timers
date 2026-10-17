import { getCategoryLabel, VILLAGE_LABELS } from '../lib/labels'
import type { Upgrade, Village } from '../lib/parser'
import { formatDuration, formatFinishTime, secondsUntil } from '../lib/time'

const VILLAGES: readonly Village[] = ['home', 'builder']

interface UpgradeListProps {
  upgrades: Upgrade[]
  now: number
}

export function UpgradeList({ upgrades, now }: UpgradeListProps) {
  return (
    <div className="space-y-6">
      {VILLAGES.map((village) => {
        const items = upgrades
          .filter((upgrade) => upgrade.village === village)
          .sort((a, b) => a.finishesAt - b.finishesAt)
        if (items.length === 0) return null

        const headingId = `village-${village}`
        return (
          <section key={village} aria-labelledby={headingId}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 id={headingId} className="text-base font-semibold text-slate-100">
                {VILLAGE_LABELS[village]}
              </h2>
              <span className="text-xs text-slate-500 tabular-nums" aria-hidden="true">
                {items.length}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} now={now} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function UpgradeRow({ upgrade, now }: { upgrade: Upgrade; now: number }) {
  const remaining = secondsUntil(upgrade.finishesAt, now)
  const isReady = remaining <= 0

  return (
    <li
      className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        isReady ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="min-w-0">
        <p
          className={`text-xs font-medium tracking-wide uppercase ${
            isReady ? 'text-emerald-300' : 'text-slate-400'
          }`}
        >
          {getCategoryLabel(upgrade.village, upgrade.category)}
        </p>
        <p className="truncate text-sm text-slate-200">
          #{upgrade.dataId} · Lv {upgrade.level}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-base font-semibold tabular-nums ${
            isReady ? 'text-emerald-300' : 'text-slate-100'
          }`}
        >
          {formatDuration(remaining)}
        </p>
        <p className="text-xs text-slate-400 tabular-nums">
          <time dateTime={new Date(upgrade.finishesAt).toISOString()}>
            {formatFinishTime(upgrade.finishesAt, now)}
          </time>
        </p>
      </div>
    </li>
  )
}
