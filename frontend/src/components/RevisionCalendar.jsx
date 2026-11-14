import { useEffect, useState } from 'react'
import * as api from '../api/api'

// Month view. Each day shows how many revisions come due on it.

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shift(key, delta) {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}

function title(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function RevisionCalendar() {
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    api
      .getCalendar(month)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [month])

  const days = data && data.month === month ? data.days : null
  const lead = days ? (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7 : 0
  const total = days ? days.reduce((n, d) => n + d.count, 0) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-ink">{title(month)}</p>
          <p className="text-xs text-ink-muted mt-0.5">
            {days ? `${total} ${total === 1 ? 'revision' : 'revisions'} due this month` : 'Loading…'}
            {data && data.overdue > 0 && ` · ${data.overdue} overdue`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => shift(m, -1))}
            aria-label="Previous month"
            className="h-8 w-8 rounded-lg border border-base-border text-ink-muted hover:border-accent hover:text-accent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => shift(m, 1))}
            aria-label="Next month"
            className="h-8 w-8 rounded-lg border border-base-border text-ink-muted hover:border-accent hover:text-accent"
          >
            ›
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-hard">Could not load the calendar. ({error})</p>}

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs text-ink-faint pb-1">
            {w}
          </div>
        ))}
        {days &&
          [...Array(lead).fill(null), ...days].map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />
            const isToday = data.today === d.date
            return (
              <div
                key={d.date}
                title={d.count ? `${d.count} due` : 'Nothing due'}
                className={`h-12 rounded-lg border px-1.5 py-1 text-left flex flex-col justify-between ${
                  isToday ? 'border-accent' : 'border-base-border'
                } ${d.count ? 'bg-accent-muted/50' : ''}`}
              >
                <span className={`text-xs ${isToday ? 'text-accent' : 'text-ink-muted'}`}>
                  {Number(d.date.slice(8))}
                </span>
                {d.count > 0 && (
                  <span className="text-xs text-ink tabular-nums self-end">{d.count}</span>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
