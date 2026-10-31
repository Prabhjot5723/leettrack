import { useEffect, useMemo, useRef, useState } from 'react'

// A 3D "revision calendar" shown behind the login screen only.
// Pure CSS 3D + a small animation loop (no extra packages).
// Each gold column is a day when a Medium question solved today comes back:
// day 5, 15, 35 and 75.
//
// Things you can do on the page:
//   - move the mouse: the camera orbits and tiles rise under the cursor
//   - drag on an empty area: spin the calendar (it keeps turning a little)
//   - click on an empty area: a ripple runs across the floor

const WEEKS = 15
// Same rules as the app: first revision after 7 / 5 / 3 days, then each gap doubles.
const LEVELS = [
  { id: 'easy', label: 'Easy', days: [7, 21] },
  { id: 'medium', label: 'Medium', days: [5, 15, 35, 75] },
  { id: 'hard', label: 'Hard', days: [3, 9, 21, 45, 93] },
]
const ALL_DAYS = [...new Set(LEVELS.flatMap((l) => l.days))]
const AUTO_MS = 6000 // how long each level is shown
const HOLD_MS = 12000 // after you click a level, stay on it a bit longer

const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const INTERACTIVE = 'input,button,a,label,select,textarea,.au-card'

export default function LoginScene() {
  const root = useRef(null)
  const [levelIndex, setLevelIndex] = useState(1) // starts on Medium
  const [held, setHeld] = useState(false) // true right after a manual click
  const [tick, setTick] = useState(0)
  const [ready, setReady] = useState(false)
  const level = LEVELS[levelIndex]
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  // columns start rising once the opening shot is over
  useEffect(() => {
    const t = setTimeout(() => setReady(true), reduced ? 0 : 1600)
    return () => clearTimeout(t)
  }, [reduced])

  // Easy -> Medium -> Hard, over and over
  useEffect(() => {
    if (reduced || !ready) return undefined
    const t = setTimeout(
      () => {
        setHeld(false)
        setLevelIndex((i) => (i + 1) % LEVELS.length)
      },
      held ? HOLD_MS : AUTO_MS
    )
    return () => clearTimeout(t)
  }, [levelIndex, held, tick, ready, reduced])

  function choose(i) {
    setLevelIndex(i)
    setHeld(true)
    setTick((n) => n + 1)
  }

  const { cells, today } = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    const offset = (t.getDay() + 6) % 7 // Monday = 0
    return {
      today: t,
      cells: Array.from({ length: WEEKS * 7 }, (_, i) => i - offset),
    }
  }, [])

  useEffect(() => {
    const el = root.current
    const host = el?.parentElement
    const stage = el?.querySelector('.s3-stage')
    if (!el || !host || !stage) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const flat = [...el.querySelectorAll('.s3-cell')].filter(
      (c) => !c.classList.contains('is-gap') && !c.classList.contains('s3-box') && !c.classList.contains('is-today')
    )
    const boxes = [...el.querySelectorAll('.s3-box')]
    const todayCell = el.querySelector('.is-today')

    const BASE_RX = 60
    const BASE_RZ = -34
    const mouse = { x: 0, y: 0, nx: 0, ny: 0, last: 0, seen: false }
    const cam = { rx: BASE_RX, rz: BASE_RZ, px: 0, py: 0 }
    const spin = { off: 0, tilt: 0, vel: 0 } // from dragging
    const drag = { on: false, x: 0, y: 0 }
    const ripples = []
    let raf = 0
    let ended = false

    const wake = () => {
      if (!raf && !ended) raf = requestAnimationFrame(frame)
    }

    function frame(now) {
      raf = 0
      const active = now - mouse.last < 1400

      // --- camera: ease towards where the mouse points, plus any drag spin
      if (!drag.on) {
        spin.off += spin.vel
        spin.vel *= 0.94
        if (Math.abs(spin.vel) < 0.01) spin.vel = 0
      }
      const tPx = mouse.seen ? mouse.nx : 0
      const tPy = mouse.seen ? mouse.ny : 0
      const targetRz = BASE_RZ + tPx * 16 + spin.off
      const targetRx = clamp(BASE_RX + tPy * 8 + spin.tilt, 38, 74)
      cam.rz += (targetRz - cam.rz) * 0.09
      cam.rx += (targetRx - cam.rx) * 0.09
      cam.px += (tPx - cam.px) * 0.09
      cam.py += (tPy - cam.py) * 0.09
      stage.style.setProperty('--rz', `${cam.rz.toFixed(2)}deg`)
      stage.style.setProperty('--rx', `${cam.rx.toFixed(2)}deg`)
      host.style.setProperty('--px', cam.px.toFixed(3))
      host.style.setProperty('--py', cam.py.toFixed(3))

      // --- tiles: rise under the cursor, and along ripples
      while (ripples.length && now - ripples[0].t0 > 2600) ripples.shift()
      let moving = false
      if (active || ripples.length || drag.on) {
        const size = flat[0] ? flat[0].offsetWidth : 30
        const radius = size * 4.2
        const sample = (cx, cy) => {
          let v = 0
          if (mouse.seen) {
            const d = Math.hypot(mouse.x - cx, mouse.y - cy)
            v += Math.exp(-((d / radius) ** 2)) * 0.9
          }
          for (const r of ripples) {
            const age = (now - r.t0) / 1000
            const d = Math.hypot(r.x - cx, r.y - cy)
            const ring = age * size * 22
            v += Math.exp(-(((d - ring) / (size * 2.4)) ** 2)) * Math.exp(-age * 1.3) * 1.6
          }
          return v
        }
        for (const c of flat) {
          const b = c.getBoundingClientRect()
          const v = sample(b.left + b.width / 2, b.top + b.height / 2)
          c.style.setProperty('--lift', `${(v * size * 0.9).toFixed(1)}px`)
          c.style.setProperty('--lit', clamp(v, 0, 1).toFixed(2))
        }
        for (const c of boxes) {
          const b = c.getBoundingClientRect()
          c.style.setProperty('--hot', clamp(sample(b.left + b.width / 2, b.top + b.height / 2), 0, 1).toFixed(2))
        }
        moving = true
      } else if (flat.length && flat[0].style.getPropertyValue('--lit') !== '0.00') {
        // settle everything back down once
        for (const c of flat) {
          c.style.setProperty('--lift', '0px')
          c.style.setProperty('--lit', '0.00')
        }
        for (const c of boxes) c.style.setProperty('--hot', '0.00')
      }

      const settling =
        Math.abs(targetRz - cam.rz) > 0.02 || Math.abs(targetRx - cam.rx) > 0.02 || spin.vel !== 0
      if (moving || settling || drag.on) raf = requestAnimationFrame(frame)
    }

    const startRipple = (x, y) => {
      ripples.push({ x, y, t0: performance.now() })
      if (ripples.length > 4) ripples.shift()
      wake()
    }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.nx = (e.clientX / window.innerWidth) * 2 - 1
      mouse.ny = (e.clientY / window.innerHeight) * 2 - 1
      mouse.last = performance.now()
      mouse.seen = true
      if (drag.on) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        drag.x = e.clientX
        drag.y = e.clientY
        spin.off += dx * 0.28
        spin.vel = dx * 0.12
        spin.tilt = clamp(spin.tilt - dy * 0.15, -16, 12)
      }
      wake()
    }
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      if (e.target.closest && e.target.closest(INTERACTIVE)) return
      startRipple(e.clientX, e.clientY)
      if (e.pointerType === 'touch') return
      drag.on = true
      drag.x = e.clientX
      drag.y = e.clientY
      spin.vel = 0
      host.classList.add('is-dragging')
    }
    const onUp = () => {
      if (!drag.on) return
      drag.on = false
      host.classList.remove('is-dragging')
      wake()
    }
    const onLeave = () => {
      mouse.seen = false
      mouse.last = 0
      wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.documentElement.addEventListener('pointerleave', onLeave)

    // Opening shot: when the intro ends, one ripple runs out from the "Today" tile.
    const intro = setTimeout(() => {
      if (todayCell) {
        const b = todayCell.getBoundingClientRect()
        startRipple(b.left + b.width / 2, b.top + b.height / 2)
      }
    }, 3300)

    return () => {
      ended = true
      clearTimeout(intro)
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      host.classList.remove('is-dragging')
      host.style.removeProperty('--px')
      host.style.removeProperty('--py')
    }
  }, [])

  return (
    <>
    <div className={ready ? 's3 is-ready' : 's3'} data-level={level.id} ref={root}>
      <div className="s3-stage" aria-hidden="true">
        <div className="s3-dolly">
          <div className="s3-drift">
            <div className="s3-world">
              <div className="s3-floor" />
              <div className="s3-grid">
                {cells.map((day, i) => {
                  const known = ALL_DAYS.includes(day)
                  if (day < 0) return <span key={i} className="s3-cell is-gap" />
                  if (day === 0) {
                    return (
                      <span key={i} className="s3-cell is-today">
                        <span className="s3-pulse" />
                        <span className="s3-tag s3-tag-today">Today</span>
                      </span>
                    )
                  }
                  if (!known) return <span key={i} className="s3-cell" />
                  const d = new Date(today)
                  d.setDate(d.getDate() + day)
                  const k = level.days.indexOf(day) + 1 // 0 = no column on this day
                  return (
                    <span
                      key={i}
                      className={k ? 's3-cell s3-box is-on' : 's3-cell s3-box'}
                      style={{ '--k': k, '--d': `${k ? k * 150 : 0}ms` }}
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

      <div className="s3-sweep" aria-hidden="true" />
      <div className="s3-vignette" aria-hidden="true" />
      <div className="s3-grain" aria-hidden="true" />
      <div className="s3-bar s3-bar-top" />
      <div className="s3-bar s3-bar-bottom" />
      <p className="s3-hint">Move your mouse · drag to spin · click for a ripple</p>
    </div>

    <div className="s3-hud" data-level={level.id}>
      <div className="s3-chips" role="group" aria-label="Question difficulty">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            className="s3-chip"
            data-l={l.id}
            aria-pressed={i === levelIndex}
            onClick={() => choose(i)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="s3-info" aria-live="polite">
        <b>{level.label}:</b> {level.days.length} revisions over {level.days[level.days.length - 1]} days
      </p>
      {!reduced && (
        <div className="s3-timer" aria-hidden="true">
          <i key={`${levelIndex}-${tick}`} style={{ animationDuration: `${held ? HOLD_MS : AUTO_MS}ms` }} />
        </div>
      )}
    </div>
    </>
  )
}
