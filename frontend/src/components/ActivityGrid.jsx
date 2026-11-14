// Last 12 weeks, one square per day, weeks run left to right (Monday on top).
// Darker square = more things done that day.

function level(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
}

const SHADES = ['bg-base-border/60', 'bg-accent/30', 'bg-accent/60', 'bg-accent']

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function label(iso, count) {
  const text = parse(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return count === 0 ? `${text}: nothing` : `${text}: ${count} ${count === 1 ? 'item' : 'items'}`
}

export default function ActivityGrid({ days }) {
  if (!days.length) return null

  // pad the first week so Monday is always the top row
  const first = parse(days[0].date)
  const lead = (first.getDay() + 6) % 7
  const cells = [...Array(lead).fill(null), ...days]

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="grid gap-1 w-max"
        style={{ gridTemplateRows: 'repeat(7, 18px)', gridAutoFlow: 'column', gridAutoColumns: '18px' }}
        role="img"
        aria-label="Your activity for the last 12 weeks"
      >
        {cells.map((c, i) =>
          c ? (
            <span
              key={c.date}
              title={label(c.date, c.count)}
              className={`rounded-[3px] ${SHADES[level(c.count)]}`}
            />
          ) : (
            <span key={`pad-${i}`} />
          )
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
        <span>Less</span>
        {SHADES.map((s) => (
          <span key={s} className={`h-3.5 w-3.5 rounded-[3px] ${s}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
