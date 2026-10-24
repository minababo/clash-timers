import type { ErrorEvent } from '@sentry/react'
import { describe, expect, it } from 'vitest'
import fixtureText from '../__fixtures__/village-export.json?raw'
import { MAX_STRING_LENGTH, scrubEvent, scrubString } from './scrubEvent'

const TAG = '#G8QPYCL8Q'

function event(overrides: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...overrides }
}

describe('scrubString', () => {
  it('redacts player tags', () => {
    expect(scrubString(`Village ${TAG} failed`)).toBe('Village #[redacted] failed')
    expect(scrubString('lowercase #g8qpycl8q too')).toBe('lowercase #[redacted] too')
  })

  it('truncates long strings', () => {
    const result = scrubString('x'.repeat(5000))
    expect(result).toHaveLength(MAX_STRING_LENGTH + '[truncated]'.length)
    expect(result.endsWith('[truncated]')).toBe(true)
  })

  it('leaves short, tag-free text alone', () => {
    expect(scrubString('Unknown upgrade ID')).toBe('Unknown upgrade ID')
  })
})

describe('scrubEvent', () => {
  it('keeps only the bare page URL from the request', () => {
    const result = scrubEvent(
      event({
        request: {
          url: 'https://clash-timers.vercel.app/?q=1#x',
          data: fixtureText,
          headers: { 'User-Agent': 'test', Cookie: 'a=b' },
          cookies: { a: 'b' },
          query_string: 'q=1',
        },
      }),
    )
    expect(result.request).toEqual({ url: 'https://clash-timers.vercel.app/' })
  })

  it('removes user info', () => {
    const result = scrubEvent(event({ user: { ip_address: '1.2.3.4', id: TAG } }))
    expect(result).not.toHaveProperty('user')
  })

  it('redacts tags and long text in the message and exception values', () => {
    const result = scrubEvent(
      event({
        message: `Failed for ${TAG}`,
        exception: {
          values: [
            { type: 'SyntaxError', value: `Unexpected token in ${fixtureText}` },
            { type: 'Error' },
          ],
        },
      }),
    )

    expect(result.message).toBe('Failed for #[redacted]')
    const [first, second] = result.exception!.values!
    expect(first.type).toBe('SyntaxError')
    expect(first.value!.length).toBeLessThanOrEqual(MAX_STRING_LENGTH + '[truncated]'.length)
    expect(first.value).not.toContain('G8QPYCL8Q')
    expect(second).toEqual({ type: 'Error' })
  })

  it('drops console and input breadcrumbs, and data on the rest', () => {
    const result = scrubEvent(
      event({
        breadcrumbs: [
          { category: 'console', message: fixtureText },
          { category: 'ui.input', message: 'textarea', data: { value: fixtureText } },
          { category: 'ui.click', message: 'button.Load', data: { value: fixtureText } },
          {
            category: 'navigation',
            data: { from: '/?tag=G8QPYCL8Q', to: '/#village', extra: fixtureText },
          },
          { category: 'custom', message: `Loaded ${TAG}` },
        ],
      }),
    )

    expect(result.breadcrumbs).toEqual([
      { category: 'ui.click', message: 'button.Load' },
      { category: 'navigation', data: { from: '/', to: '/' } },
      { category: 'custom', message: 'Loaded #[redacted]' },
    ])
  })

  it('drops large extra fields and redacts the small ones', () => {
    const result = scrubEvent(
      event({
        extra: {
          inputLength: 12345,
          rawExport: fixtureText,
          note: `about ${TAG}`,
          nested: { text: fixtureText },
        },
      }),
    )

    expect(result.extra).toEqual({ inputLength: 12345, note: 'about #[redacted]' })
  })

  it('never lets the export or the tag through', () => {
    const result = scrubEvent(
      event({
        message: fixtureText,
        request: { url: 'https://clash-timers.vercel.app/', data: fixtureText },
        breadcrumbs: [{ category: 'ui.click', message: fixtureText, data: { fixtureText } }],
        extra: { fixtureText },
        exception: { values: [{ type: 'Error', value: fixtureText }] },
      }),
    )

    const serialised = JSON.stringify(result)
    expect(serialised).not.toContain('G8QPYCL8Q')
    expect(serialised).not.toContain('"buildings"')
    expect(serialised.length).toBeLessThan(2000)
  })
})
