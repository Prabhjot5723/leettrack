import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell, { FormError, fieldInputClass, primaryButtonClass } from '../components/AuthShell'
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
    <Link to="/login" className="text-accent hover:underline">
      Back to log in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell footer={backLink}>
        <h1 className="text-lg font-semibold text-ink mb-1">Check your email</h1>
        <p className="text-sm text-ink-muted mb-4">
          If an account exists for <span className="text-ink break-all">{sentTo}</span>, we've
          sent a link to choose a new password. It works once and expires in 30 minutes.
        </p>
        <p className="text-sm text-ink-muted mb-5">
          Nothing in your inbox? Look in spam, then check you typed the same email you signed up
          with.
        </p>

        <FormError>{error}</FormError>

        <button
          type="button"
          onClick={send}
          disabled={submitting || wait > 0}
          className="w-full py-2.5 rounded-lg border border-base-border text-sm text-ink hover:border-accent hover:text-accent disabled:opacity-60 disabled:hover:border-base-border disabled:hover:text-ink transition-colors"
        >
          {submitting ? 'Sending…' : wait > 0 ? `Send again in ${wait}s` : 'Send again'}
        </button>
        <button
          type="button"
          onClick={() => {
            setSentTo(null)
            setError(null)
          }}
          className="w-full mt-2 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          Use a different email
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell footer={backLink}>
      <form onSubmit={send}>
        <h1 className="text-lg font-semibold text-ink mb-1">Reset your password</h1>
        <p className="text-sm text-ink-muted mb-5">
          Enter the email you signed up with. We'll send you a link to choose a new password.
        </p>

        <FormError>{error}</FormError>

        <div className="mb-5">
          <label htmlFor="email" className="block text-xs text-ink-muted mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={fieldInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
