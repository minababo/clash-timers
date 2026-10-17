import { useState } from 'react'
import { PasteForm } from './components/PasteForm'
import { VillageView } from './components/VillageView'
import type { VillageExport } from './lib/parser'

function App() {
  const [villageExport, setVillageExport] = useState<VillageExport | null>(null)

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-xl px-4 pt-6 pb-12 sm:pt-12">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Clash <span className="text-amber-400">Timers</span>
          </h1>
          {!villageExport && (
            <p className="mt-1 text-slate-400">Paste your village export to track upgrades.</p>
          )}
        </header>

        {villageExport ? (
          <VillageView data={villageExport} onReset={() => setVillageExport(null)} />
        ) : (
          <PasteForm onLoad={setVillageExport} />
        )}
      </main>
    </div>
  )
}

export default App
