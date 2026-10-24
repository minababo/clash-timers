import * as Sentry from '@sentry/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import fixtureText from '../lib/__fixtures__/village-export.json?raw'
import { PasteForm } from './PasteForm'

vi.mock('@sentry/react', () => ({
  isInitialized: vi.fn(() => true),
  captureMessage: vi.fn(),
}))

const captureMessage = vi.mocked(Sentry.captureMessage)

function submit(text: string) {
  fireEvent.change(screen.getByLabelText('Village export'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Load village' }))
}

describe('PasteForm error reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports invalid JSON with the code and input length only', () => {
    // A cut-off export: starts like the real thing, including the tag, but isn't valid JSON.
    const truncated = fixtureText.slice(0, 500)
    render(<PasteForm onLoad={vi.fn()} />)
    submit(truncated)

    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage).toHaveBeenCalledWith('Village export failed to parse', {
      level: 'warning',
      tags: { parse_error: 'invalid_json' },
      extra: { inputLength: 500 },
      fingerprint: ['parse-error', 'invalid_json'],
    })
    const sent = JSON.stringify(captureMessage.mock.calls)
    expect(sent).not.toContain('G8QPYCL8Q')
    expect(sent).not.toContain(truncated.slice(0, 20))
  })

  it('reports JSON that is not an export', () => {
    render(<PasteForm onLoad={vi.fn()} />)
    submit('{"hello":"world"}')

    expect(captureMessage).toHaveBeenCalledWith(
      'Village export failed to parse',
      expect.objectContaining({
        tags: { parse_error: 'not_village_export' },
        extra: { inputLength: 17 },
      }),
    )
  })

  it('reports nothing for a valid export', () => {
    const onLoad = vi.fn()
    render(<PasteForm onLoad={onLoad} />)
    submit(fixtureText)

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(captureMessage).not.toHaveBeenCalled()
  })
})
