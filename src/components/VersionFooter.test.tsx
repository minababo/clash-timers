import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VersionFooter } from './VersionFooter'

describe('VersionFooter', () => {
  it('shows the values injected at build time ("local" outside Vercel) without a link', () => {
    render(<VersionFooter />)

    expect(__APP_COMMIT__).toBe('local')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/^Version local$/)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links a real SHA to its commit on GitHub', () => {
    render(<VersionFooter commit="abc1234" env="production" />)

    const link = screen.getByRole('link', { name: 'abc1234' })
    expect(link).toHaveAttribute('href', 'https://github.com/minababo/clash-timers/commit/abc1234')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/^Version abc1234$/)
  })

  it('marks preview builds and offers a test error', () => {
    render(<VersionFooter commit="abc1234" env="preview" />)

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      /^Version abc1234 \(preview\) · Send test error$/,
    )
    // React reports errors from event handlers as uncaught window errors, which is what
    // Sentry's global handler listens for.
    const uncaught: string[] = []
    const onError = (event: ErrorEvent) => {
      uncaught.push(event.error?.message)
      event.preventDefault()
    }
    window.addEventListener('error', onError)
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Send test error' }))
    } finally {
      window.removeEventListener('error', onError)
    }
    expect(uncaught).toEqual(['Clash Timers test error (preview build)'])
  })

  it.each(['production', 'development', 'local'])('has no test error button in %s', (env) => {
    render(<VersionFooter commit="abc1234" env={env} />)

    expect(screen.queryByRole('button', { name: 'Send test error' })).not.toBeInTheDocument()
  })

  it('does not link a value that is not a SHA', () => {
    render(<VersionFooter commit="not-a-sha" env="production" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
