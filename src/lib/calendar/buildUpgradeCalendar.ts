import { formatLevel, getCategoryLabel, VILLAGE_LABELS } from '../labels'
import { getUpgradeName } from '../names'
import type { Upgrade } from '../parser'
import { escapeText, formatUtcDateTime, serializeLines } from './ics'

const PRODID = '-//Clash Timers//Upgrade Calendar//EN'
const EVENT_DURATION_MS = 5 * 60 * 1000
const DISCLAIMER = 'Times are based on your export. Re-export after using boosts.'

export interface UpgradeCalendarInput {
  /** The village's display name (nickname or tag), used at the start of each summary. */
  villageLabel: string
  tag: string
  upgrades: readonly Upgrade[]
  /** ms epoch; upgrades finishing at or before this are skipped. Also used for DTSTAMP. */
  now: number
}

/**
 * Builds an iCalendar file with one event, plus an alarm at finish time, for each running upgrade.
 */
export function buildUpgradeCalendar({
  villageLabel,
  tag,
  upgrades,
  now,
}: UpgradeCalendarInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const upgrade of upgrades) {
    if (upgrade.finishesAt <= now) continue

    const summary = `${villageLabel}: ${getUpgradeName(upgrade.dataId, upgrade.section)} ${formatLevel(upgrade.level, true)} ready`
    const description = [
      getCategoryLabel(upgrade.village, upgrade.category),
      VILLAGE_LABELS[upgrade.village],
      `Player tag: ${tag}`,
      '',
      DISCLAIMER,
    ].join('\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${upgradeUid(tag, upgrade)}`,
      `DTSTAMP:${formatUtcDateTime(now)}`,
      `DTSTART:${formatUtcDateTime(upgrade.finishesAt)}`,
      `DTEND:${formatUtcDateTime(upgrade.finishesAt + EVENT_DURATION_MS)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      // Reminders shouldn't mark the user as busy.
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(summary)}`,
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return serializeLines(lines)
}

/**
 * Stable per upgrade and export, so re-importing the same file updates events instead of
 * duplicating them in calendars that honour UID. The tag is reduced to letters and digits
 * so "#" and anything else unexpected can't leak into the value.
 */
function upgradeUid(tag: string, upgrade: Upgrade): string {
  const safeTag = tag.replace(/[^A-Za-z0-9]/g, '') || 'village'
  const safeId = upgrade.id.replace(/[^A-Za-z0-9_-]/g, '')
  return `${safeTag}-${safeId}-${upgrade.finishesAt}@clash-timers`
}
