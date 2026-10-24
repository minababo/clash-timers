import { ErrorBoundary } from '@sentry/react'
import type { ReactNode } from 'react'
import { PRIMARY_BUTTON } from './buttonStyles'

/** Catches render crashes, reports them to Sentry (when enabled) and shows a reload screen. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={<CrashScreen />}>{children}</ErrorBoundary>
}

function CrashScreen() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-xl px-4 pt-6 pb-12 sm:pt-12">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Clash <span className="text-amber-400">Timers</span>
        </h1>
        <div
          role="alert"
          className="mt-6 space-y-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4"
        >
          <p className="text-rose-100">Something went wrong. Reload the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${PRIMARY_BUTTON} w-full`}
          >
            Reload
          </button>
        </div>
      </main>
    </div>
  )
}
