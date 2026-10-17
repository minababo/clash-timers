import { useId, useState, type FormEvent } from 'react'
import { parseVillageExport, type ParseResult, type VillageExport } from '../lib/parser'

type ParseError = Extract<ParseResult, { ok: false }>['error']

const ERROR_MESSAGES: Readonly<Record<ParseError, string>> = {
  invalid_json:
    "That doesn't look like a village export. Copy it again from Clash and paste the whole thing.",
  not_village_export: 'This is valid JSON but not a Clash village export.',
}

const CLIPBOARD_FAILED = "Couldn't read your clipboard. Paste into the box above instead."

interface PasteFormProps {
  onLoad: (data: VillageExport) => void
}

export function PasteForm({ onLoad }: PasteFormProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null)
  const textareaId = useId()
  const helpId = useId()

  async function handlePasteFromClipboard() {
    setClipboardMessage(null)
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard API not supported')
      const pasted = await navigator.clipboard.readText()
      if (!pasted.trim()) throw new Error('Clipboard is empty')
      setText(pasted)
      setError(null)
    } catch {
      setClipboardMessage(CLIPBOARD_FAILED)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseVillageExport(text)
    if (result.ok) {
      onLoad(result.data)
    } else {
      setError(ERROR_MESSAGES[result.error])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor={textareaId} className="block text-sm font-medium text-slate-200">
          Village export
        </label>
        <p id={helpId} className="text-sm text-slate-400">
          In Clash, go to{' '}
          <span className="text-slate-200">Settings → More Settings → Data Export</span> and tap
          Copy.
        </p>
        <textarea
          id={textareaId}
          aria-describedby={helpId}
          aria-invalid={error ? true : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          placeholder="In Clash go to Settings → More Settings → Data Export → Copy, then paste here."
          rows={7}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="block w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-sm text-slate-100 placeholder:font-sans placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="min-h-12 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 font-medium text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:bg-slate-700"
        >
          Paste from clipboard
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="min-h-12 flex-1 rounded-xl bg-amber-400 px-4 font-semibold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          Load village
        </button>
      </div>

      {clipboardMessage && (
        <p role="status" className="text-sm text-slate-400">
          {clipboardMessage}
        </p>
      )}
    </form>
  )
}
