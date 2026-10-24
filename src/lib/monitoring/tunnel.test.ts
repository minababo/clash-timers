import { describe, expect, it, vi } from 'vitest'
import vercelConfig from '../../../vercel.json'
import {
  handleTunnelRequest,
  MAX_ENVELOPE_BYTES,
  parseDsn,
  readEnvelopeDsn,
  TUNNEL_PATH,
} from './tunnel'

const OUR_DSN = 'https://publickey123@o4501234.ingest.us.sentry.io/4507654'
const INGEST_URL = 'https://o4501234.ingest.us.sentry.io/api/4507654/envelope/'

function envelope(dsn: unknown, event = { message: 'hello' }): string {
  return [
    JSON.stringify({ event_id: 'abc', sent_at: '2026-10-25T00:00:00Z', dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n')
}

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://clash-timers.vercel.app/monitoring', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'X-Forwarded-For': '203.0.113.7',
      Cookie: 'a=b',
      ...headers,
    },
  })
}

function fakeFetch(status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(null, { status }))
}

describe('parseDsn', () => {
  it('reads host, project ID and public key', () => {
    expect(parseDsn(OUR_DSN)).toEqual({
      host: 'o4501234.ingest.us.sentry.io',
      projectId: '4507654',
      publicKey: 'publickey123',
    })
  })

  it.each([
    'not a url',
    'http://key@o1.ingest.sentry.io/1',
    'https://o1.ingest.sentry.io/1',
    'https://key@o1.ingest.sentry.io/',
    'https://key@o1.ingest.sentry.io/abc',
  ])('rejects %s', (dsn) => {
    expect(parseDsn(dsn)).toBeNull()
  })
})

describe('readEnvelopeDsn', () => {
  const encode = (text: string) => new TextEncoder().encode(text)

  it('reads the dsn from the first line', () => {
    expect(readEnvelopeDsn(encode(envelope(OUR_DSN)))).toBe(OUR_DSN)
  })

  it.each([
    ['no dsn', JSON.stringify({ event_id: 'abc' })],
    ['a non-string dsn', JSON.stringify({ dsn: 42 })],
    ['a header that is not JSON', 'garbage\n{}'],
    ['an empty body', ''],
  ])('returns null for %s', (_, text) => {
    expect(readEnvelopeDsn(encode(text))).toBeNull()
  })
})

describe('handleTunnelRequest', () => {
  it('forwards an envelope for our DSN to our ingest URL, without visitor headers', async () => {
    const fetch = fakeFetch(200)
    const body = envelope(OUR_DSN)

    const response = await handleTunnelRequest(post(body), { dsn: OUR_DSN, fetch })

    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(INGEST_URL)
    expect(init?.method).toBe('POST')
    expect(new TextDecoder().decode(init?.body as Uint8Array)).toBe(body)
    expect(init?.headers).toEqual({ 'Content-Type': 'application/x-sentry-envelope' })
  })

  it('passes on the upstream status', async () => {
    const response = await handleTunnelRequest(post(envelope(OUR_DSN)), {
      dsn: OUR_DSN,
      fetch: fakeFetch(429),
    })
    expect(response.status).toBe(429)
  })

  it.each([
    ['another host', 'https://publickey123@evil.example.com/4507654'],
    ['another Sentry org', 'https://publickey123@o999.ingest.us.sentry.io/4507654'],
    ['another project', 'https://publickey123@o4501234.ingest.us.sentry.io/1'],
    ['another key', 'https://otherkey@o4501234.ingest.us.sentry.io/4507654'],
    ['plain http', 'http://publickey123@o4501234.ingest.us.sentry.io/4507654'],
    ['no dsn', undefined],
  ])('refuses an envelope for %s and never forwards it', async (_, envelopeDsn) => {
    const fetch = fakeFetch()

    const response = await handleTunnelRequest(post(envelope(envelopeDsn)), { dsn: OUR_DSN, fetch })

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses a body that is not an envelope', async () => {
    const fetch = fakeFetch()
    const response = await handleTunnelRequest(post('hello'), { dsn: OUR_DSN, fetch })

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses oversized bodies', async () => {
    const fetch = fakeFetch()
    const big = envelope(OUR_DSN, { message: 'x'.repeat(MAX_ENVELOPE_BYTES) })

    const response = await handleTunnelRequest(post(big), { dsn: OUR_DSN, fetch })

    expect(response.status).toBe(413)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('only accepts POST', async () => {
    const fetch = fakeFetch()
    const response = await handleTunnelRequest(
      new Request('https://clash-timers.vercel.app/monitoring'),
      { dsn: OUR_DSN, fetch },
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is off (404) when no DSN is configured', async () => {
    const fetch = fakeFetch()
    const response = await handleTunnelRequest(post(envelope(OUR_DSN)), { dsn: undefined, fetch })

    expect(response.status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers 502 when Sentry is unreachable', async () => {
    const unreachable = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })
    const response = await handleTunnelRequest(post(envelope(OUR_DSN)), {
      dsn: OUR_DSN,
      fetch: unreachable,
    })

    expect(response.status).toBe(502)
  })
})

describe('vercel.json', () => {
  it('routes the tunnel path to the function before the index.html fallback', () => {
    expect(vercelConfig.rewrites[0]).toEqual({
      source: TUNNEL_PATH,
      destination: '/api/monitoring',
    })
  })
})
