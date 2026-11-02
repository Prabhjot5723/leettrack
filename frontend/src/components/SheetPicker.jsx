import { useEffect, useState } from 'react'
import * as api from '../api/api'

// Lets the user pick which question sheet LeetTrack serves new questions from.
// Used on the Dashboard (first time, as a pop-up) and on the Profile page.
export default function SheetPicker({ current, onChosen, title = 'Choose your sheet' }) {
  const [sheets, setSheets] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    api
      .getSheets()
      .then(setSheets)
      .catch((err) => setError(err.message))
  }, [])

  async function choose(sheet) {
    if (sheet.sheet_id === current || busy) return
    setBusy(sheet.sheet_id)
    setError(null)
    try {
      const user = await api.chooseSheet(sheet.sheet_id)
      onChosen?.(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {title && <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>}
      <p className="text-sm text-ink-muted mb-4">
        LeetTrack picks your daily new questions from this sheet. You can change it any time —
        what you have already solved stays saved.
      </p>

      {error && (
        <div className="rounded-lg border border-hard/30 bg-hard-bg px-3 py-2 mb-3 text-sm text-hard">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sheets.map((s) => {
          const active = s.sheet_id === current
          return (
            <button
              key={s.sheet_id}
              type="button"
              onClick={() => choose(s)}
              disabled={Boolean(busy)}
              className={`text-left rounded-card border p-4 transition-colors disabled:opacity-60 ${
                active
                  ? 'border-accent bg-accent-muted'
                  : 'border-base-border bg-base-card hover:border-accent/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink text-sm">{s.name}</span>
                <span className="text-xs text-ink-muted shrink-0">{s.question_count} questions</span>
              </div>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{s.description}</p>
              <span className={`inline-block mt-3 text-xs ${active ? 'text-accent' : 'text-ink-faint'}`}>
                {busy === s.sheet_id ? 'Saving…' : active ? '✓ Your current sheet' : 'Use this sheet'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
