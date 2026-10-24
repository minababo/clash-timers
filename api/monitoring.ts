// Vercel Function behind the Sentry tunnel: vercel.json rewrites /monitoring here.
// The logic (and its tests) lives in src/lib/monitoring/tunnel.ts.
import { handleTunnelRequest } from '../src/lib/monitoring/tunnel.js'

export function POST(request: Request): Promise<Response> {
  return handleTunnelRequest(request, { dsn: process.env.VITE_SENTRY_DSN, fetch })
}
