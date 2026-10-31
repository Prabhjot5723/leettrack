import { useEffect, useMemo, useRef } from 'react'

// A 3D "revision calendar" shown behind the login screen only.
// Pure CSS 3D (no extra packages). Each lit column is a day when a Medium
// question solved today comes back: day 5, 15, 35 and 75.

const WEEKS = 15
const DUE_DAYS = [5, 15, 35, 75]

const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function LoginScene() {
  const stage = useRef(null)

  const { cells, today } = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    const offset = (t.getDay() + 6) % 7 // Monday = 0
    return {
      today: t,
      cells: Array.from({ length: WEEKS * 7 }, (_, i) => i - offset),
    }
  }, [])

  // The scene and the form card lean gently towards the mouse.
  useEffect(() => {
    const el = stage.current
    const host = el?.parentElement
    if (!el || !host) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let raf = 0
    let px = 0
    let py = 0
    const apply = () => {
      raf = 0
      host.style.setProperty('--px', px.toFixed(3))
      host.style.setProperty('--py', py.toFixed(3))
    }
    const onMove = (e) => {
      px = (e.clientX / window.innerWidth) * 2 - 1
      py = (e.clientY / window.innerHeight) * 2 - 1
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
      host.style.removeProperty('--px')
      host.style.removeProperty('--py')
    }
  }, [])

  return (
    <div className="s3" ref={stage} aria-hidden="true">
      <div className="s3-stage">
        <div className="s3-dolly">
          <div className="s3-drift">
            <div className="s3-world">
              <div className="s3-floor" />
              <div className="s3-grid">
                {cells.map((day, i) => {
                  const k = DUE_DAYS.indexOf(day)
                  if (day < 0) return <span key={i} className="s3-cell is-gap" />
                  if (day === 0) {
                    return (
                      <span key={i} className="s3-cell is-today">
                        <span className="s3-pulse" />
                        <span className="s3-tag s3-tag-today">Today</span>
                      </span>
                    )
                  }
                  if (k < 0) return <span key={i} className="s3-cell" />
                  const d = new Date(today)
                  d.setDate(d.getDate() + day)
                  return (
                    <span
                      key={i}
                      className="s3-cell s3-box"
                      style={{ '--k': k + 1, '--delay': `${1500 + k * 260}ms` }}
                    >
                      <span className="s3-glow" />
                      <span className="s3-face s3-front" />
                      <span className="s3-face s3-right" />
                      <span className="s3-face s3-left" />
                      <span className="s3-face s3-top" />
                      <span className="s3-tag">
                        <b>Day {day}</b>
                        {fmt(d)}
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="s3-sweep" />
      <div className="s3-vignette" />
      <div className="s3-grain" />
      <div className="s3-bar s3-bar-top" />
      <div className="s3-bar s3-bar-bottom" />
    </div>
  )
}
