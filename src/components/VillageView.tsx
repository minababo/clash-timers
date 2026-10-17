import type { VillageExport } from '../lib/parser'
import { useNow } from '../lib/time'
import { UpgradeList } from './UpgradeList'
import { UpgradeSummary } from './UpgradeSummary'

interface VillageViewProps {
  data: VillageExport
  onReset: () => void
}

export function VillageView({ data, onReset }: VillageViewProps) {
  const now = useNow()

  return (
    <div className="space-y-6">
      <UpgradeSummary data={data} now={now} />
      <UpgradeList upgrades={data.upgrades} now={now} />
      <button
        type="button"
        onClick={onReset}
        className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 font-medium text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:bg-slate-700"
      >
        Load another export
      </button>
    </div>
  )
}
