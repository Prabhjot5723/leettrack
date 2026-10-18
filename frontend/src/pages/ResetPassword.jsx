import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell, { FormError, primaryButtonClass } from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import PasswordStrength from '../components/PasswordStrength'
import * as api from '../api/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [linkProblem, setLinkProblem] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      // A 422 about the link itself means a fresh link is needed, not a retry.
      if (/reset link/i.test(err.message)) setLinkProblem(true)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthShell>
        <h1 className="text-lg font-semibold text-ink mb-1">Password updated</h1>
        <p className="text-sm text-ink-muted mb-5">
          Your new password is saved. Log in with it to continue.
        </p>
        <Link to="/login" className={`${primaryButtonClass} block text-center`}>
          Log in
        </Link>
      </AuthShell>
    )
  }

  if (!token || linkProblem) {
    return (
      <AuthShell
        footer={
          <Link to="/login" className="text-accent hover:underline">
            Back to log in
          </Link>
        }
      >
        <h1 className="text-lg font-semibold text-ink mb-1">This link can't be used</h1>
        <p className="text-sm text-ink-muted mb-5">
          {token
            ? 'Reset links work once and expire after 30 minutes. This one has been used or has expired.'
            : "The link looks incomplete. Open the full link from your email, or request a new one."}
        </p>
        <Link to="/forgot-password" className={`${primaryButtonClass} block text-center`}>
          Request a new link
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      footer={
        <Link to="/login" className="text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <h1 className="text-lg font-semibold text-ink mb-1">Choose a new password</h1>
        <p className="text-sm text-ink-muted mb-5">
          Use at least 8 characters. You'll log in with this password from now on.
        </p>

        <FormError>{error}</FormError>

        <div className="mb-1">
          <label htmlFor="new-password" className="block text-xs text-ink-muted mb-1">
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            autoFocus
            describedBy="new-password-strength"
          />
          <PasswordStrength id="new-password-strength" password={password} />
        </div>

        <div className="mb-5">
          <label htmlFor="confirm-password" className="block text-xs text-ink-muted mb-1">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError(null)
            }}
            placeholder="Type it again"
            autoComplete="new-password"
            describedBy="confirm-hint"
          />
          <p
            id="confirm-hint"
            className={`mt-1.5 text-xs h-4 ${mismatch ? 'text-hard' : 'text-easy'}`}
            aria-live="polite"
          >
            {confirm.length === 0 ? '' : mismatch ? 'Passwords do not match.' : 'Passwords match.'}
          </p>
        </div>

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  )
}
