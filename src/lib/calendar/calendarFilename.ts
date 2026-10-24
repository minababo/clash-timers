/**
 * "clash-timers-<name>-<YYYY-MM-DD>.ics" using the local date. The name keeps only letters,
 * digits, "-" and "_" (spaces become "-"); if nothing is left it falls back to the tag, then
 * to "village".
 */
export function calendarFilename(name: string, tag: string, now: number): string {
  const date = new Date(now)
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const slug = slugify(name) || slugify(tag) || 'village'
  return `clash-timers-${slug}-${ymd}.ics`
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}
