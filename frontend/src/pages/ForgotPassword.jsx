import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell, { AuthError } from '../components/AuthShell'
import * as api from '../api/api'

const RESEND_SECONDS = 30

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [wait, setWait] = useState(0)

  // Count down before "Send again" unlocks (also keeps us under the server's limit).
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function send(e) {
    e?.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.forgotPassword(email.trim())
      setSentTo(email.trim())
      setWait(RESEND_SECONDS)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const backLink = (
    <Link to="/login" className="au-link">
      Back to log in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell footer={backLink}>
        <h1 className="au-h1">Check your email</h1>
        <p className="au-sub">
          If an account exists for <strong>{sentTo}</strong>, we've sent a link to choose a new
          password. It works once and expires in 30 minutes.
        </p>
        <p className="au-text">
          Nothing in your inbox? Look in spam, then check you typed the same email you signed up
          with.
        </p>

        <AuthError>{error}</AuthError>

        <button
          type="button"
          onClick={send}
          disabled={submitting || wait > 0}
          className="au-btn au-btn-ghost"
        >
          {submitting ? 'Sending…' : wait > 0 ? `Send again in ${wait}s` : 'Send again'}
        </button>
        <button
          type="button"
          onClick={() => {
            setSentTo(null)
            setError(null)
          }}
          className="au-btn au-btn-text"
        >
          Use a different email
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell footer={backLink}>
      <form onSubmit={send}>
        <h1 className="au-h1">Reset your password</h1>
        <p className="au-sub">
          Enter the email you signed up with. We'll send you a link to choose a new password.
        </p>

        <AuthError>{error}</AuthError>

        <div className="au-field">
          <label htmlFor="email" className="au-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="au-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        <button type="submit" disabled={submitting} className="au-btn au-btn-primary">
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
