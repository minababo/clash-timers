import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import fixtureText from './lib/__fixtures__/village-export.json?raw'

// The fixture's `timestamp`, so countdowns read exactly the export's timers.
const EXPORTED_AT = 1792269773000

function pasteAndLoad(text: string) {
  fireEvent.change(screen.getByLabelText('Village export'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Load village' }))
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: EXPORTED_AT })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the fixture upgrades split by village', () => {
    render(<App />)
    pasteAndLoad(fixtureText)

    const home = screen.getByRole('region', { name: 'Home Village' })
    const builder = screen.getByRole('region', { name: 'Builder Base' })
    expect(within(home).getAllByRole('listitem')).toHaveLength(8)
    expect(within(builder).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getAllByRole('listitem')).toHaveLength(12)

    const [firstHome] = within(home).getAllByRole('listitem')
    expect(firstHome).toHaveTextContent('Builder')
    expect(firstHome).toHaveTextContent('#1000003 · Lv 15')
    expect(firstHome).toHaveTextContent('10h 29m')

    expect(screen.getByText('#G8QPYCL8Q')).toBeInTheDocument()
    expect(screen.getByText('Exported just now')).toBeInTheDocument()
  })

  it('counts down live and marks finished upgrades as ready', () => {
    render(<App />)
    pasteAndLoad(fixtureText)

    act(() => {
      vi.setSystemTime(EXPORTED_AT + 37_745_000 - 1_000)
      vi.advanceTimersByTime(1000)
    })

    const [firstHome] = within(screen.getByRole('region', { name: 'Home Village' })).getAllByRole(
      'listitem',
    )
    expect(firstHome).toHaveTextContent('Ready')
    expect(screen.getByText('Exported 10h 29m ago')).toBeInTheDocument()
    expect(screen.getByText('1 upgrade is ready')).toBeInTheDocument()
  })

  it('goes back to the paste form', () => {
    render(<App />)
    pasteAndLoad(fixtureText)
    fireEvent.click(screen.getByRole('button', { name: 'Load another export' }))

    expect(screen.getByLabelText('Village export')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('shows an error for input that is not JSON', () => {
    render(<App />)
    pasteAndLoad('this is not an export')

    expect(screen.getByRole('alert')).toHaveTextContent(
      "That doesn't look like a village export. Copy it again from Clash and paste the whole thing.",
    )
    expect(screen.queryByRole('region', { name: 'Home Village' })).not.toBeInTheDocument()
  })

  it('shows an error for JSON that is not a village export', () => {
    render(<App />)
    pasteAndLoad('{"hello": "world"}')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This is valid JSON but not a Clash village export.',
    )
  })

  it('asks the user to paste manually when the clipboard is unavailable', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Paste from clipboard' }))
    })

    expect(screen.getByRole('status')).toHaveTextContent("Couldn't read your clipboard.")
  })
})
