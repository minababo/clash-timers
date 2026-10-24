import type { Breadcrumb, ErrorEvent } from '@sentry/react'

/** Longest string kept in a message, exception value or breadcrumb message. */
export const MAX_STRING_LENGTH = 200
/** Extra fields whose JSON is longer than this are dropped (an export is far longer). */
export const MAX_EXTRA_LENGTH = 200

// Player tags use these characters, e.g. #G8QPYCL8Q.
const PLAYER_TAG = /#[0289PYLQGRJCUV]{3,}/gi

/** Redacts player tags and truncates long strings. */
export function scrubString(value: string): string {
  const redacted = value.replace(PLAYER_TAG, '#[redacted]')
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}[truncated]`
    : redacted
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0]
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const category = breadcrumb.category ?? ''
  // Console output and input events can contain anything the page handled, including the export.
  if (category === 'console' || category.startsWith('ui.input')) return null

  const scrubbed: Breadcrumb = { ...breadcrumb }
  if (scrubbed.message) scrubbed.message = scrubString(scrubbed.message)
  if (category === 'navigation' && scrubbed.data) {
    const { from, to } = scrubbed.data
    scrubbed.data = {
      ...(typeof from === 'string' && { from: stripQuery(from) }),
      ...(typeof to === 'string' && { to: stripQuery(to) }),
    }
  } else {
    delete scrubbed.data
  }
  return scrubbed
}

/**
 * Sentry `beforeSend`: removes anything that could contain a pasted export or a player tag.
 * Keeps the page URL (without query or hash), error types and stack traces.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event }

  // Request data, headers and cookies go; only the bare page URL stays.
  scrubbed.request = event.request?.url ? { url: stripQuery(event.request.url) } : undefined
  delete scrubbed.user

  if (scrubbed.message) scrubbed.message = scrubString(scrubbed.message)

  if (event.exception?.values) {
    scrubbed.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => ({
        ...exception,
        ...(exception.value !== undefined && { value: scrubString(exception.value) }),
      })),
    }
  }

  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null)
  }

  if (event.extra) {
    scrubbed.extra = Object.fromEntries(
      Object.entries(event.extra)
        .filter(([, value]) => (JSON.stringify(value) ?? '').length <= MAX_EXTRA_LENGTH)
        .map(([key, value]) => [key, typeof value === 'string' ? scrubString(value) : value]),
    )
  }

  return scrubbed
}
