// Sentry tunnel: the browser SDK posts envelopes to a same-origin path (so ad blockers that block
// *.ingest.sentry.io don't drop them), and a Vercel function (api/monitoring.ts) forwards them.
// This file has no imports so the function can use it as is.

/** Same-origin path the SDK posts to; vercel.json rewrites it to the function. */
export const TUNNEL_PATH = '/monitoring'

/** Our events are a few kB; anything far bigger isn't from this app. */
export const MAX_ENVELOPE_BYTES = 200_000

interface Dsn {
  host: string
  projectId: string
  publicKey: string
}

/** Parses a Sentry DSN such as https://<key>@o123.ingest.sentry.io/456. */
export function parseDsn(dsn: string): Dsn | null {
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\/+|\/+$/g, '')
    if (url.protocol !== 'https:' || !url.username || !/^\d+$/.test(projectId)) return null
    return { host: url.host, projectId, publicKey: url.username }
  } catch {
    return null
  }
}

/** Reads the `dsn` from an envelope's first line (its JSON header). */
export function readEnvelopeDsn(body: Uint8Array): string | null {
  const newline = body.indexOf(0x0a)
  const header = newline === -1 ? body : body.subarray(0, newline)
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(header))
    if (typeof parsed === 'object' && parsed !== null && 'dsn' in parsed) {
      return typeof parsed.dsn === 'string' ? parsed.dsn : null
    }
    return null
  } catch {
    return null
  }
}

interface TunnelOptions {
  /** Our own DSN. Only envelopes addressed to it are forwarded, and only to its ingest host. */
  dsn: string | undefined
  fetch: typeof fetch
}

/**
 * Forwards a Sentry envelope to our project's ingest endpoint. The destination is built from our
 * own DSN, never from the request; the request's DSN only has to match it. The visitor's IP and
 * headers are not passed on.
 */
export async function handleTunnelRequest(
  request: Request,
  { dsn, fetch }: TunnelOptions,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  }

  const allowed = dsn ? parseDsn(dsn) : null
  if (!allowed) return new Response(null, { status: 404 })

  if (Number(request.headers.get('content-length')) > MAX_ENVELOPE_BYTES) {
    return new Response(null, { status: 413 })
  }
  const body = new Uint8Array(await request.arrayBuffer())
  if (body.byteLength > MAX_ENVELOPE_BYTES) return new Response(null, { status: 413 })

  const envelopeDsnText = readEnvelopeDsn(body)
  const envelopeDsn = envelopeDsnText ? parseDsn(envelopeDsnText) : null
  if (
    !envelopeDsn ||
    envelopeDsn.host !== allowed.host ||
    envelopeDsn.projectId !== allowed.projectId ||
    envelopeDsn.publicKey !== allowed.publicKey
  ) {
    return new Response(null, { status: 400 })
  }

  try {
    const upstream = await fetch(`https://${allowed.host}/api/${allowed.projectId}/envelope/`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    })
    return new Response(null, { status: upstream.status })
  } catch {
    return new Response(null, { status: 502 })
  }
}
