// Low-level iCalendar (RFC 5545) formatting helpers.

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75
const encoder = new TextEncoder()

/** Escapes a TEXT value: backslash, semicolon, comma and newlines (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Folds a content line so no physical line exceeds 75 octets (RFC 5545 §3.1). Continuation
 * lines start with a space, which counts toward their 75. Never splits a multi-byte character.
 */
export function foldLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let currentOctets = 0
  for (const char of line) {
    const octets = encoder.encode(char).length
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
    if (currentOctets + octets > limit) {
      parts.push(current)
      current = ''
      currentOctets = 0
    }
    current += char
    currentOctets += octets
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

/** Formats an epoch-ms time as a UTC DATE-TIME, e.g. 20261016030000Z. */
export function formatUtcDateTime(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** Joins content lines into an iCalendar document: each line folded and ended with CRLF. */
export function serializeLines(lines: readonly string[]): string {
  return lines.map((line) => foldLine(line) + CRLF).join('')
}
