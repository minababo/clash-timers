const REPO_URL = 'https://github.com/minababo/clash-timers'
const SHA_PATTERN = /^[0-9a-f]{7,40}$/

interface VersionFooterProps {
  /** Defaults to the value injected at build time. */
  commit?: string
  /** Defaults to the value injected at build time. */
  env?: string
}

export function VersionFooter({ commit = __APP_COMMIT__, env = __APP_ENV__ }: VersionFooterProps) {
  const isSha = SHA_PATTERN.test(commit)

  return (
    <footer className="mt-12 text-center text-xs text-slate-500">
      Version{' '}
      {isSha ? (
        <a
          href={`${REPO_URL}/commit/${commit}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline decoration-slate-700 underline-offset-2 hover:text-slate-300"
        >
          {commit}
        </a>
      ) : (
        <span className="font-mono">{commit}</span>
      )}
      {env === 'preview' && (
        <>
          {' (preview) · '}
          <button
            type="button"
            onClick={throwTestError}
            className="underline decoration-slate-700 underline-offset-2 hover:text-slate-300"
          >
            Send test error
          </button>
        </>
      )}
    </footer>
  )
}

/** Preview builds only: an uncaught error, to check that Sentry receives reports. */
function throwTestError(): never {
  throw new Error('Clash Timers test error (preview build)')
}
