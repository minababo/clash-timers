import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import fixtureText from './lib/__fixtures__/village-export.json?raw'
import { STORAGE_KEY } from './lib/storage'

// The fixture's `timestamp`, so countdowns read exactly the export's timers.
const EXPORTED_AT = 1792269773000
const TAG = '#G8QPYCL8Q'
const OTHER_TAG = '#OTHER'
const otherExport = fixtureText.replace(`"tag":"${TAG}"`, `"tag":"${OTHER_TAG}"`)

function pasteAndLoad(text: string) {
  fireEvent.change(screen.getByLabelText('Village export'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Load village' }))
}

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function villageCards() {
  return within(screen.getByRole('region', { name: 'Your villages' })).getAllByRole('listitem')
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: EXPORTED_AT })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('first run', () => {
    it('shows the paste form when nothing is saved', () => {
      render(<App />)

      expect(screen.getByLabelText('Village export')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    })

    it('saves a pasted village and shows its upgrades split by village', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      expect(screen.getByRole('heading', { name: TAG })).toBeInTheDocument()
      const home = screen.getByRole('region', { name: 'Home Village' })
      const builder = screen.getByRole('region', { name: 'Builder Base' })
      expect(within(home).getAllByRole('listitem')).toHaveLength(8)
      expect(within(builder).getAllByRole('listitem')).toHaveLength(4)

      const [firstHome] = within(home).getAllByRole('listitem')
      expect(firstHome).toHaveTextContent('Builder')
      expect(firstHome).toHaveTextContent('Elixir Storage · Lv 15 → 16')
      expect(firstHome).toHaveTextContent('10h 29m')

      const builderHero = within(builder)
        .getAllByRole('listitem')
        .find((row) => row.textContent?.includes('Battle Copter'))
      expect(builderHero).toHaveTextContent('Hero')
      expect(builderHero).toHaveTextContent('Battle Copter · Lv 28 → 29')

      const summary = screen.getByRole('region', { name: 'Summary' })
      expect(summary).toHaveTextContent('Elixir Storage · Lv 15 → 16')
      expect(screen.queryByText(/^Unknown/)).not.toBeInTheDocument()
      expect(screen.getByText('Exported just now')).toBeInTheDocument()

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      expect(stored).toMatchObject({ version: 1, villages: [{ tag: TAG, rawExport: fixtureText }] })
    })

    it('shows an error for input that is not JSON', () => {
      render(<App />)
      pasteAndLoad('this is not an export')

      expect(screen.getByRole('alert')).toHaveTextContent(
        "That doesn't look like a village export. Copy it again from Clash and paste the whole thing.",
      )
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
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
        click('Paste from clipboard')
      })

      expect(screen.getByRole('status')).toHaveTextContent("Couldn't read your clipboard.")
    })
  })

  describe('saved villages', () => {
    it('lists a saved village after the app is reopened', () => {
      const { unmount } = render(<App />)
      pasteAndLoad(fixtureText)
      unmount()

      render(<App />)

      const cards = villageCards()
      expect(cards).toHaveLength(1)
      expect(cards[0]).toHaveTextContent(TAG)
      expect(cards[0]).toHaveTextContent('10h 29m')
      expect(cards[0]).toHaveTextContent('Updated just now')
    })

    it('updates the existing village when the same tag is pasted again', () => {
      render(<App />)
      pasteAndLoad(fixtureText)
      click('Villages')

      click('Add or update village')
      pasteAndLoad(fixtureText)

      expect(screen.getByRole('status')).toHaveTextContent(`Updated ${TAG}`)
      click('Villages')
      expect(villageCards()).toHaveLength(1)
    })

    it('adds a second card for a different tag', () => {
      render(<App />)
      pasteAndLoad(fixtureText)
      click('Villages')

      click('Add or update village')
      pasteAndLoad(otherExport)

      expect(screen.getByRole('heading', { name: OTHER_TAG })).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      click('Villages')
      expect(villageCards()).toHaveLength(2)
    })

    it('opens a village from its card and goes back', () => {
      render(<App />)
      pasteAndLoad(fixtureText)
      pasteAndLoadFromList(otherExport)
      click('Villages')

      fireEvent.click(within(villageCards()[0]).getByRole('button'))
      expect(screen.getByRole('region', { name: 'Home Village' })).toBeInTheDocument()

      click('Villages')
      expect(villageCards()).toHaveLength(2)
    })

    it('puts villages with something ready first', () => {
      const later = otherExport.replace('"timestamp":1792269773', '"timestamp":1792269000')
      render(<App />)
      pasteAndLoad(fixtureText)
      pasteAndLoadFromList(later)
      click('Villages')

      // #OTHER was exported 773s earlier, so its first upgrade finishes first.
      act(() => {
        vi.setSystemTime(EXPORTED_AT + 37_745_000 - 773_000)
        vi.advanceTimersByTime(1000)
      })

      const [first, second] = villageCards()
      expect(first).toHaveTextContent(OTHER_TAG)
      expect(first).toHaveTextContent('1 ready')
      expect(second).toHaveTextContent(TAG)
      expect(second).not.toHaveTextContent('ready')
    })

    it('renames a village and keeps the nickname on update', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      click(`Rename ${TAG}`)
      fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Main' } })
      click('Save')

      expect(screen.getByRole('heading', { name: 'Main' })).toBeInTheDocument()
      expect(screen.getByText(TAG)).toBeInTheDocument()

      click('Update this village')
      pasteAndLoad(fixtureText)
      expect(screen.getByRole('status')).toHaveTextContent('Updated Main')

      click('Villages')
      expect(villageCards()[0]).toHaveTextContent('Main')
    })

    it('cancels a rename without saving', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      click(`Rename ${TAG}`)
      fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Main' } })
      click('Cancel')

      expect(screen.getByRole('heading', { name: TAG })).toBeInTheDocument()
    })

    it('deletes a village only after confirming', () => {
      render(<App />)
      pasteAndLoad(fixtureText)
      pasteAndLoadFromList(otherExport)

      click('Delete village')
      click('Cancel')
      expect(screen.getByRole('heading', { name: OTHER_TAG })).toBeInTheDocument()

      click('Delete village')
      click('Yes, delete')

      const cards = villageCards()
      expect(cards).toHaveLength(1)
      expect(cards[0]).toHaveTextContent(TAG)
    })

    it('returns to the paste form after deleting the last village', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      click('Delete village')
      click('Yes, delete')

      expect(screen.getByLabelText('Village export')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
        version: 1,
        villages: [],
      })
    })

    it('goes back from the paste form without changing anything', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      click('Update this village')
      click('Back')

      expect(screen.getByRole('heading', { name: TAG })).toBeInTheDocument()
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
      expect(firstHome).toHaveTextContent('Elixir Storage · Lv 16')
      expect(firstHome).not.toHaveTextContent('→')
      // The summary moves on to the next running upgrade (Frosty, pets 73000009, lvl 5).
      expect(screen.getByRole('region', { name: 'Summary' })).toHaveTextContent('Frosty · Lv 5 → 6')
      expect(screen.getByText('Exported 10h 29m ago')).toBeInTheDocument()
      expect(screen.getByText('1 upgrade is ready')).toBeInTheDocument()
    })
  })

  describe('Add to Calendar', () => {
    const BLOB_URL = 'blob:clash-timers-test'
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => BLOB_URL)
    const revokeObjectURL = vi.fn<(url: string) => void>()
    const downloadedNames: string[] = []

    beforeEach(() => {
      // jsdom implements neither of these.
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloadedNames.push(this.download)
      })
    })

    afterEach(() => {
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
      createObjectURL.mockClear()
      revokeObjectURL.mockClear()
      downloadedNames.length = 0
      vi.restoreAllMocks()
    })

    it('downloads a calendar file with an event per running upgrade', async () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      const button = screen.getByRole('button', { name: 'Add to Calendar' })
      expect(button).toBeEnabled()
      expect(button).toHaveAccessibleDescription(
        'Adds an alarm for each running upgrade. Add from one device only. Adding again creates duplicates, so delete the old events first.',
      )
      fireEvent.click(button)

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const blob = createObjectURL.mock.calls[0][0]
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/calendar;charset=utf-8')
      const ics = await blob.text()
      expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
      expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(12)
      expect(ics).toContain('SUMMARY:#G8QPYCL8Q: Elixir Storage Lv 16 ready')

      expect(downloadedNames).toHaveLength(1)
      expect(downloadedNames[0]).toMatch(/^clash-timers-G8QPYCL8Q-\d{4}-\d{2}-\d{2}\.ics$/)
      expect(document.querySelector('a[download]')).toBeNull()

      expect(revokeObjectURL).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(1000))
      expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL)
    })

    it('uses the nickname in the summaries and filename', async () => {
      render(<App />)
      pasteAndLoad(fixtureText)
      click(`Rename ${TAG}`)
      fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Main, alt' } })
      click('Save')

      click('Add to Calendar')

      const ics = await createObjectURL.mock.calls[0][0].text()
      expect(ics).toContain('SUMMARY:Main\\, alt: Elixir Storage Lv 16 ready')
      expect(downloadedNames[0]).toMatch(/^clash-timers-Main-alt-\d{4}-\d{2}-\d{2}\.ics$/)
    })

    it('is disabled with a note when nothing is running', () => {
      render(<App />)
      pasteAndLoad(fixtureText)

      // The last fixture upgrade (Spell Tower) finishes 443584s after export.
      act(() => {
        vi.setSystemTime(EXPORTED_AT + 443_584_000 - 1_000)
        vi.advanceTimersByTime(1000)
      })

      const button = screen.getByRole('button', { name: 'Add to Calendar' })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription('Nothing is upgrading right now.')
      fireEvent.click(button)
      expect(createObjectURL).not.toHaveBeenCalled()
    })
  })
})

/** From an open village: back to the list, then add another export. */
function pasteAndLoadFromList(text: string) {
  click('Villages')
  click('Add or update village')
  pasteAndLoad(text)
}
