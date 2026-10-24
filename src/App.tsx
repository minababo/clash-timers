import { useState } from 'react'
import { BackButton } from './components/BackButton'
import { PasteForm } from './components/PasteForm'
import { VersionFooter } from './components/VersionFooter'
import { VillageList } from './components/VillageList'
import { VillageView } from './components/VillageView'
import { getVillageName } from './lib/labels'
import { useVillages } from './lib/storage'

type Screen =
  | { name: 'list' }
  | { name: 'village'; tag: string }
  | { name: 'paste'; returnTo: Exclude<Screen, { name: 'paste' }> }

function App() {
  const { villages, upsertVillage, removeVillage, renameVillage } = useVillages()
  const [screen, setScreen] = useState<Screen>({ name: 'list' })
  const [notice, setNotice] = useState<string | null>(null)

  function navigate(next: Screen) {
    setNotice(null)
    setScreen(next)
  }

  function handleLoad(rawExport: string) {
    const result = upsertVillage(rawExport)
    if (!result.ok) return
    setScreen({ name: 'village', tag: result.village.tag })
    setNotice(result.updated ? `Updated ${getVillageName(result.village)}` : null)
  }

  const isFirstRun = villages.length === 0
  const openVillage =
    screen.name === 'village' ? villages.find((village) => village.tag === screen.tag) : undefined

  let content
  if (isFirstRun || screen.name === 'paste') {
    content = (
      <div className="space-y-4">
        {screen.name === 'paste' && !isFirstRun && (
          <>
            <BackButton label="Back" onClick={() => navigate(screen.returnTo)} />
            <h2 className="text-xl font-bold text-white">Add or update a village</h2>
          </>
        )}
        <PasteForm onLoad={handleLoad} />
      </div>
    )
  } else if (openVillage) {
    content = (
      <VillageView
        key={openVillage.tag}
        village={openVillage}
        notice={notice}
        onBack={() => navigate({ name: 'list' })}
        onUpdate={() =>
          navigate({ name: 'paste', returnTo: { name: 'village', tag: openVillage.tag } })
        }
        onRename={(nickname) => renameVillage(openVillage.tag, nickname)}
        onDelete={() => {
          removeVillage(openVillage.tag)
          navigate({ name: 'list' })
        }}
      />
    )
  } else {
    content = (
      <VillageList
        villages={villages}
        onOpen={(tag) => navigate({ name: 'village', tag })}
        onAdd={() => navigate({ name: 'paste', returnTo: { name: 'list' } })}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-xl px-4 pt-6 pb-12 sm:pt-12">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Clash <span className="text-amber-400">Timers</span>
          </h1>
          {isFirstRun && (
            <p className="mt-1 text-slate-400">Paste your village export to track upgrades.</p>
          )}
        </header>

        {content}

        <VersionFooter />
      </main>
    </div>
  )
}

export default App
