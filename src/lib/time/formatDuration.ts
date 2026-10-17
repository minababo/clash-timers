const UNITS = [
  ['d', 86_400],
  ['h', 3_600],
  ['m', 60],
  ['s', 1],
] as const

/**
 * Formats a duration using its two largest units, e.g. "3d 4h" or "12m 30s".
 * A zero second unit is dropped ("2h", not "2h 0m"). Zero, negative or NaN → "Ready".
 */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds)
  if (!(total > 0)) return 'Ready'

  const index = UNITS.findIndex(([, size]) => total >= size)
  const [unit, size] = UNITS[index]
  const parts = [`${Math.floor(total / size)}${unit}`]

  const next = UNITS[index + 1]
  if (next) {
    const [nextUnit, nextSize] = next
    const remainder = Math.floor((total % size) / nextSize)
    if (remainder > 0) parts.push(`${remainder}${nextUnit}`)
  }

  return parts.join(' ')
}

/** Whole seconds left until `ms`, rounded up so a timer only reads "Ready" once it has passed. */
export function secondsUntil(ms: number, now: number): number {
  return Math.ceil((ms - now) / 1000)
}
