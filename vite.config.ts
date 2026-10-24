/// <reference types="vitest/config" />
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Set by Vercel at build time (needs "Enable access to System Environment Variables" in the
// project settings). Local and Docker builds fall back to "local".
const appCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'
const appEnv = process.env.VERCEL_ENV || 'local'

// Source maps are only built and uploaded to Sentry when all three are set (Vercel builds).
// Otherwise the build is unchanged: no source maps at all.
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env
const uploadSourceMaps = Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Must come last.
    uploadSourceMaps &&
      sentryVitePlugin({
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        authToken: SENTRY_AUTH_TOKEN,
        telemetry: false,
        // Same release as Sentry.init and the footer.
        release: { name: appCommit, setCommits: false },
        // Uploaded maps are deleted so they aren't served with the site.
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      }),
  ],
  // "hidden": maps are generated for upload, but the bundles don't reference them.
  build: { sourcemap: uploadSourceMaps ? 'hidden' : false },
  define: {
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_ENV__: JSON.stringify(appEnv),
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
