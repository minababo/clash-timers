import * as Sentry from '@sentry/react'
import type { ParseErrorCode } from '../parser'
import { scrubEvent } from './scrubEvent'
import { TUNNEL_PATH } from './tunnel'

/**
 * Starts Sentry error reporting, but only when a DSN was provided at build time
 * (VITE_SENTRY_DSN). Local dev, tests, Docker and CI builds have none and send nothing.
 * Errors only: no tracing, no session replay, no release-health sessions.
 */
export function initMonitoring(dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN): boolean {
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: __APP_ENV__,
    // Matches the version in the footer.
    release: __APP_COMMIT__,
    // Same-origin endpoint (a Vercel Function) instead of *.ingest.sentry.io, which ad blockers
    // and Brave Shields block. Only DSN builds use it, and only Vercel builds have a DSN.
    tunnel: TUNNEL_PATH,
    // Sentry 11 replaced `sendDefaultPii` with `dataCollection`, whose defaults collect.
    // Turn every category off (the equivalent of sendDefaultPii: false, and stricter).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Errors only: no SDK telemetry about dropped events either.
    sendClientReports: false,
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== 'BrowserSession'),
    beforeSend: scrubEvent,
  })
  return true
}

/** Reports a failed paste. Only the error code and the input's length, never the text. */
export function reportParseError(code: ParseErrorCode, inputLength: number): void {
  if (!Sentry.isInitialized()) return
  Sentry.captureMessage('Village export failed to parse', {
    level: 'warning',
    tags: { parse_error: code },
    extra: { inputLength },
    fingerprint: ['parse-error', code],
  })
}

const reportedUnknownUpgrades = new Set<string>()

/** Reports an upgrade ID with no known name, at most once per section/ID pair per page load. */
export function reportUnknownUpgrade(section: string, dataId: number): void {
  if (!Sentry.isInitialized()) return
  const key = `${section}:${dataId}`
  if (reportedUnknownUpgrades.has(key)) return
  reportedUnknownUpgrades.add(key)

  Sentry.captureMessage('Unknown upgrade ID', {
    level: 'warning',
    tags: { section, data_id: String(dataId) },
    fingerprint: ['unknown-upgrade', section, String(dataId)],
  })
}
