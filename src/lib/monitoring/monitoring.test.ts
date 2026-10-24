import * as Sentry from '@sentry/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initMonitoring, reportParseError, reportUnknownUpgrade } from './monitoring'
import { scrubEvent } from './scrubEvent'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  captureMessage: vi.fn(),
}))

const init = vi.mocked(Sentry.init)
const isInitialized = vi.mocked(Sentry.isInitialized)
const captureMessage = vi.mocked(Sentry.captureMessage)

beforeEach(() => {
  vi.clearAllMocks()
  isInitialized.mockReturnValue(false)
})

describe('initMonitoring', () => {
  it('does nothing without a DSN (the default in local, test, Docker and CI builds)', () => {
    expect(import.meta.env.VITE_SENTRY_DSN).toBeUndefined()

    expect(initMonitoring()).toBe(false)
    expect(initMonitoring('')).toBe(false)
    expect(init).not.toHaveBeenCalled()
  })

  it('initialises errors-only reporting with the build environment and release', () => {
    expect(initMonitoring('https://key@o0.ingest.sentry.io/1')).toBe(true)

    expect(init).toHaveBeenCalledTimes(1)
    const options = init.mock.calls[0][0]!
    expect(options).toMatchObject({
      dsn: 'https://key@o0.ingest.sentry.io/1',
      environment: 'local',
      release: 'local',
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
      beforeSend: scrubEvent,
      sendClientReports: false,
    })
    // No tracing or replay configured.
    expect(options).not.toHaveProperty('tracesSampleRate')
    expect(options).not.toHaveProperty('replaysSessionSampleRate')
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate')
  })

  it('drops the release-health session integration and keeps the rest', () => {
    initMonitoring('https://key@o0.ingest.sentry.io/1')
    const integrations = init.mock.calls[0][0]!.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[]

    const kept = integrations([
      { name: 'Breadcrumbs' },
      { name: 'BrowserSession' },
      { name: 'GlobalHandlers' },
    ])
    expect(kept.map((i) => i.name)).toEqual(['Breadcrumbs', 'GlobalHandlers'])
  })
})

describe('without Sentry initialised', () => {
  it('captures nothing', () => {
    reportParseError('invalid_json', 10)
    reportUnknownUpgrade('buildings', 1000999)

    expect(captureMessage).not.toHaveBeenCalled()
  })
})

describe('with Sentry initialised', () => {
  beforeEach(() => {
    isInitialized.mockReturnValue(true)
  })

  it('reports a parse error with only its code and the input length', () => {
    reportParseError('not_village_export', 1234)

    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage).toHaveBeenCalledWith('Village export failed to parse', {
      level: 'warning',
      tags: { parse_error: 'not_village_export' },
      extra: { inputLength: 1234 },
      fingerprint: ['parse-error', 'not_village_export'],
    })
  })

  it('reports each unknown section/ID pair once per page load', () => {
    reportUnknownUpgrade('buildings', 1000901)
    reportUnknownUpgrade('buildings', 1000901)
    reportUnknownUpgrade('buildings2', 1000901)
    reportUnknownUpgrade('heroes', 28000901)
    reportUnknownUpgrade('buildings', 1000901)

    expect(captureMessage).toHaveBeenCalledTimes(3)
    expect(captureMessage).toHaveBeenCalledWith('Unknown upgrade ID', {
      level: 'warning',
      tags: { section: 'buildings', data_id: '1000901' },
      fingerprint: ['unknown-upgrade', 'buildings', '1000901'],
    })
    expect(captureMessage).toHaveBeenCalledWith(
      'Unknown upgrade ID',
      expect.objectContaining({ tags: { section: 'buildings2', data_id: '1000901' } }),
    )
  })
})
