export interface FormatFinishTimeOptions {
  /** Defaults to the user's locale. */
  locale?: string
  /** Defaults to the user's timezone. */
  timeZone?: string
}

const DAY_MS = 86_400_000

/** Calendar day of `ms` in `timeZone`, as a day count since the Unix epoch. */
function calendarDay(ms: number, timeZone: string | undefined): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(ms)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(part('year'), part('month') - 1, part('day')) / DAY_MS
}

/**
 * Formats when an upgrade finishes relative to `now`, in 24-hour time:
 * "Today 21:55", "Tomorrow 04:25", "Fri 05:25" within the next week,
 * and with the date added ("Fri 30 Oct 05:25") beyond that or in the past.
 */
export function formatFinishTime(
  ms: number,
  now: number,
  { locale, timeZone }: FormatFinishTimeOptions = {},
): string {
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ms)

  const daysAway = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (daysAway === 0) return `Today ${time}`
  if (daysAway === 1) return `Tomorrow ${time}`

  const dayOptions: Intl.DateTimeFormatOptions =
    daysAway > 1 && daysAway < 7
      ? { weekday: 'short' }
      : { weekday: 'short', day: 'numeric', month: 'short' }
  const day = new Intl.DateTimeFormat(locale, { ...dayOptions, timeZone }).format(ms)
  return `${day} ${time}`
}
