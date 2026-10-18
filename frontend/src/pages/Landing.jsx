import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

// These numbers are the SAME rules the backend uses (backend/engine.py):
//   first revision after N days, each later gap doubles, limited number of revisions,
//   and a "point" cost per question against a daily budget of 100.
const RULES = {
  Easy: { first: 7, limit: 2, points: 30, tone: 'easy' },
  Medium: { first: 5, limit: 4, points: 40, tone: 'medium' },
  Hard: { first: 3, limit: 5, points: 55, tone: 'hard' },
}
const LEVELS = Object.keys(RULES)
const WEEKS = 15 // 15 columns x 7 rows covers the longest plan (93 days) from any weekday

// Day numbers (counted from the day you solve it) when each revision is due,
// assuming you revise on the due day. Each gap counts from the day you revise.
function schedule(level) {
  const { first, limit } = RULES[level]
  let day = 0
  return Array.from({ length: limit }, (_, c) => {
    const gap = first * 2 ** c
    day += gap
    return { n: c + 1, gap, day }
  })
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtMonth = (d) => d.toLocaleDateString('en-IN', { month: 'short' })

export default function Landing() {
  const [level, setLevel] = useState('Medium')
  const [active, setActive] = useState(null) // day number being hovered in the list
  const [lit, setLit] = useState(false)
  const today = useMemo(startOfToday, [])

  useEffect(() => {
    const previous = document.title
    document.title = 'LeetTrack: know exactly when to revise'
    return () => {
      document.title = previous
    }
  }, [])

  // One orchestrated moment: the due days light up once, right after the page appears.
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const plan = useMemo(() => schedule(level), [level])
  const tone = RULES[level].tone
  const dueByDay = useMemo(() => new Map(plan.map((p) => [p.day, p])), [plan])
  const lastDay = plan[plan.length - 1].day

  // Monday = 0. Today sits in its real weekday row, so the grid reads like a calendar.
  const offset = (today.getDay() + 6) % 7
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => i - offset) // day number per cell

  const monthLabels = useMemo(() => {
    const out = []
    let prev = -1
    for (let c = 0; c < WEEKS; c++) {
      const d = addDays(today, Math.max(c * 7 - offset, 0))
      if (d.getMonth() !== prev) {
        out.push({ c, label: fmtMonth(d) })
        prev = d.getMonth()
      }
    }
    // Drop the first label if the next month starts right after it (they would overlap).
    if (out.length > 1 && out[1].c - out[0].c < 2) out.shift()
    return out
  }, [today, offset])

  return (
    <div className="lp">
      <div className="lp-wrap">
        <header className="lp-top">
          <Link to="/welcome" className="lp-brand" aria-label="LeetTrack home">
            <span className="lp-mark" aria-hidden="true">
              {'{}'}
            </span>
            LeetTrack
          </Link>
          <nav className="lp-nav" aria-label="Main">
            <a href="#how" className="lp-nav-link lp-hide-small">
              How it works
            </a>
            <Link to="/login" className="lp-nav-link lp-hide-tiny">
              Log in
            </Link>
            <Link to="/login?mode=register" className="lp-btn lp-btn-primary lp-btn-small">
              Create account
            </Link>
          </nav>
        </header>

        <main>
          <section className="lp-hero">
            <h1 className="lp-h1">
              <span>Solve it once.</span>
              <span>See exactly when it comes back.</span>
            </h1>
            <p className="lp-lead">
              LeetTrack plans your DSA revision for you. Every question you solve gets its own
              schedule, and the gaps grow as you remember it.
            </p>
            <div className="lp-actions">
              <Link to="/login?mode=register" className="lp-btn lp-btn-primary">
                Create account
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">
                Log in
              </Link>
            </div>

            <div className="lp-demo" data-tone={tone}>
              <div className="lp-demo-head">
                <p className="lp-demo-title" id="difficulty-label">
                  Try it: how hard is the question?
                </p>
                <div className="lp-chips" role="group" aria-labelledby="difficulty-label">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className="lp-chip"
                      data-tone={RULES[l].tone}
                      aria-pressed={level === l}
                      onClick={() => {
                        setLevel(l)
                        setActive(null)
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lp-demo-body">
                <div className="lp-cal">
                  <div className="lp-months" aria-hidden="true">
                    {monthLabels.map((m) => (
                      <span key={m.c} style={{ gridColumn: m.c + 1 }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                  <div className="lp-grid" aria-hidden="true" data-testid="calendar">
                    {cells.map((day, i) => {
                      const due = lit ? dueByDay.get(day) : undefined
                      let cls = 'lp-cell'
                      if (day < 0) cls += ' is-gap'
                      else if (day === 0) cls += ' is-today'
                      else if (due) cls += ' is-due'
                      if (due && active === day) cls += ' is-active'
                      return (
                        <span
                          key={i}
                          className={cls}
                          style={due ? { '--delay': `${(due.n - 1) * 140}ms` } : undefined}
                          title={
                            day === 0
                              ? 'Today: you solve it'
                              : due
                                ? `${fmtDate(addDays(today, day))}: revision ${due.n}`
                                : undefined
                          }
                        />
                      )
                    })}
                  </div>
                </div>

                <div>
                  <ol className="lp-rows" aria-label={`Revision plan for a ${level} question`}>
                    <li className="lp-row lp-row-start">
                      <span className="lp-dot lp-dot-today" aria-hidden="true" />
                      <span className="lp-row-name">
                        You solve it
                        <span className="lp-row-gap">Day 0</span>
                      </span>
                      <span className="lp-row-date">{fmtDate(today)}</span>
                    </li>
                    {plan.map((p) => (
                      <li
                        key={`${level}-${p.n}`}
                        className={`lp-row${active === p.day ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(p.day)}
                        onMouseLeave={() => setActive(null)}
                      >
                        <span className="lp-dot" aria-hidden="true" />
                        <span className="lp-row-name">
                          Revision {p.n}
                          <span className="lp-row-gap">
                            {p.gap} days after {p.n === 1 ? 'you solve it' : `revision ${p.n - 1}`}
                          </span>
                        </span>
                        <span className="lp-row-date">{fmtDate(addDays(today, p.day))}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="lp-note">
                    A {level} question gets {plan.length} revisions over {lastDay} days. This
                    assumes you revise on the due day. Revise late, and the next gap counts from
                    the day you actually revise.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="lp-section" id="how" aria-labelledby="how-title">
            <div className="lp-split">
              <div>
                <h2 className="lp-h2" id="how-title">
                  Every day has a budget of 100 points.
                </h2>
                <p className="lp-copy">
                  Each question costs points, based on how hard it is. Revisions that are due go
                  into your day first. Whatever is left is filled with new questions, picked to use
                  as much of the budget as possible.
                </p>
              </div>
              <div>
                <p className="lp-example-label">An example day</p>
                <div className="lp-stack" role="img" aria-label="A Medium revision (40 points), an Easy revision (30 points) and one new Easy question (30 points) add up to 100 points.">
                  <span className="lp-seg" data-tone="medium" style={{ flex: '40 1 0' }}>
                    Medium revision · 40
                  </span>
                  <span className="lp-seg" data-tone="easy" style={{ flex: '30 1 0' }}>
                    Easy revision · 30
                  </span>
                  <span className="lp-seg is-new" data-tone="easy" style={{ flex: '30 1 0' }}>
                    New Easy · 30
                  </span>
                </div>
                <ul className="lp-costs">
                  {LEVELS.map((l) => (
                    <li key={l} data-tone={RULES[l].tone}>
                      <span className="lp-dot" aria-hidden="true" />
                      {l}
                      <strong>{RULES[l].points} points</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="lp-section" aria-label="What you get">
            <dl className="lp-facts">
              <div className="lp-fact">
                <dt>A 200-question bank</dt>
                <dd>
                  Easy, Medium and Hard questions you can search by title and filter by
                  difficulty. Mark one as solved and its schedule starts.
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Progress you can read</dt>
                <dd>
                  See how many Easy, Medium and Hard questions you have solved, and how many you
                  solve each day.
                </dd>
              </div>
              <div className="lp-fact">
                <dt>Any day, previewed</dt>
                <dd>
                  Pick a future date on your dashboard to see which revisions will be due, without
                  changing any of your data.
                </dd>
              </div>
            </dl>
          </section>

          <section className="lp-section lp-final" aria-labelledby="final-title">
            <h2 className="lp-h2" id="final-title">
              Solve one today. It comes back when it's due.
            </h2>
            <div className="lp-actions">
              <Link to="/login?mode=register" className="lp-btn lp-btn-primary">
                Create account
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">
                Log in
              </Link>
            </div>
          </section>
        </main>

        <footer className="lp-foot">
          <span>LeetTrack</span>
          <span>Questions, revisions and progress for DSA practice.</span>
        </footer>
      </div>
    </div>
  )
}
