/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Set by Vercel at build time (needs "Enable access to System Environment Variables" in the
// project settings). Local and Docker builds fall back to "local".
const appCommit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'
const appEnv = process.env.VERCEL_ENV || 'local'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
