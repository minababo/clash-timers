// Imported first in main.tsx so Sentry is set up before the app renders.
import { initMonitoring } from './monitoring'

initMonitoring()
