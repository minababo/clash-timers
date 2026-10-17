const BASE =
  'inline-flex min-h-12 items-center justify-center rounded-xl px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'

export const PRIMARY_BUTTON = `${BASE} bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300 active:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500`

export const SECONDARY_BUTTON = `${BASE} border border-slate-700 bg-slate-800 font-medium text-slate-100 hover:bg-slate-700 active:bg-slate-700`

export const DANGER_BUTTON = `${BASE} bg-rose-600 font-semibold text-white hover:bg-rose-500 active:bg-rose-500`

export const QUIET_DANGER_BUTTON = `${BASE} border border-rose-500/40 font-medium text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/10`

/** Text-style button for "Back"; still a full 48px tap target. */
export const BACK_BUTTON =
  'inline-flex min-h-12 items-center gap-1 rounded-xl pr-3 font-medium text-amber-300 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
