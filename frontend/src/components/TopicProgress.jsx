import { useState } from 'react'

// One thin bar per topic of the user's sheet: "Arrays 12 / 37".
const COLLAPSED = 8

export default function TopicProgress({ topics }) {
  const [showAll, setShowAll] = useState(false)

  if (!topics.length) {
    return <p className="text-sm text-ink-faint py-6">This sheet has no questions yet.</p>
  }

  const visible = showAll ? topics : topics.slice(0, COLLAPSED)

  return (
    <div>
      <ul className="space-y-3">
        {visible.map((t) => {
          const pct = t.total ? Math.round((t.solved / t.total) * 100) : 0
          return (
            <li key={t.topic}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink truncate">{t.topic}</span>
                <span className="text-ink-muted tabular-nums shrink-0">
                  {t.solved} / {t.total}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 rounded-full bg-base-border overflow-hidden"
                role="progressbar"
                aria-label={`${t.topic}: ${t.solved} of ${t.total} solved`}
                aria-valuemin={0}
                aria-valuemax={t.total}
                aria-valuenow={t.solved}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>

      {topics.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-sm text-accent hover:underline"
        >
          {showAll ? 'Show fewer topics' : `Show all ${topics.length} topics`}
        </button>
      )}
    </div>
  )
}
