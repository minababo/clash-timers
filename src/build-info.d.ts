// Replaced at build time by Vite's `define` (see vite.config.ts).

/** Short commit SHA of the build (VERCEL_GIT_COMMIT_SHA), or "local". */
declare const __APP_COMMIT__: string

/** Vercel environment: "production", "preview" or "development", or "local" outside Vercel. */
declare const __APP_ENV__: string

interface ImportMetaEnv {
  /** Sentry DSN. Set in Vercel only; without it, error reporting is off. */
  readonly VITE_SENTRY_DSN?: string
}
