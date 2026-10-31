import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/auth.css'

// Shared frame for the login, sign-up, forgot-password and reset-password screens.
// Wide screens: a brand side with a small revision calendar, and the form beside it.
// Phones: just the form, with the logo on top.

const WEEKS = 15
// A Medium question solved today comes back on these days. Same rule as the
// backend (5 days, then each gap doubles: 5, +10, +20, +40).
const MEDIUM_DAYS = [5, 15, 35, 75]

const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

function Brand({ className = '' }) {
  return (
    <Link to="/welcome" className={`au-brand ${className}`} aria-label="LeetTrack home">
      <span className="au-mark" aria-hidden="true">
        {'{}'}
      </span>
      LeetTrack
    </Link>
  )
}

function MiniCalendar() {
  const [lit, setLit] = useState(false)
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // The days light up one after another, once, when the screen appears.
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const offset = (today.getDay() + 6) % 7 // Monday = 0
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => i - offset)

  return (
    <>
      <div className="au-grid" aria-hidden="true">
        {cells.map((day, i) => {
          const n = MEDIUM_DAYS.indexOf(day)
          let cls = 'au-cell'
          if (day < 0) cls += ' is-gap'
          else if (day === 0) cls += ' is-today'
          else if (lit && n >= 0) cls += ' is-due'
          return (
            <span key={i} className={cls} style={n >= 0 ? { '--delay': `${n * 160}ms` } : undefined} />
          )
        })}
      </div>
      <ul className="au-days" aria-label="Revision dates for a Medium question solved today">
        {MEDIUM_DAYS.map((day) => {
          const d = new Date(today)
          d.setDate(d.getDate() + day)
          return (
            <li key={day}>
              <span className="au-dot" aria-hidden="true" />
              {fmtDate(d)}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function AuthShell({ children, footer, scene = null }) {
  return (
    <div className={scene ? 'au au-3d' : 'au'}>
      {scene}
      <aside className="au-aside">
        <Brand />
        <div>
          <h2 className="au-aside-h">Your next revisions, already planned.</h2>
          <p className="au-aside-p">
            {scene
              ? 'Every question you solve gets its own revision schedule. Harder questions come back sooner, and more often.'
              : 'Solve a Medium question today and it comes back after 5, 15, 35 and 75 days. Every question you solve gets a schedule like this.'}
          </p>
          {!scene && <MiniCalendar />}
        </div>
        <p className="au-aside-foot">Questions, revisions and progress for DSA practice.</p>
      </aside>

      <main className="au-main">
        <div className="au-top">
          <Brand className="au-brand-small" />
          <Link to="/welcome" className="au-back">
            Back to home
          </Link>
        </div>
        <div className="au-center">
          <div className="au-card">
            {children}
            {footer && <div className="au-footer">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}

// ---- Older helpers, still used by the Profile page's change-password form.
// (They use the app's Tailwind theme, so the dark app screens keep their look.)

export function FormError({ children }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="rounded-lg border border-hard/30 bg-hard-bg px-3 py-2 mb-4 text-sm text-hard"
    >
      {children}
    </div>
  )
}

export const fieldInputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-base border border-base-border text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent'

export const primaryButtonClass =
  'w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity'

// ---- New: error box for the login-style screens.
export function AuthError({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="au-error">
      {children}
    </div>
  )
}
