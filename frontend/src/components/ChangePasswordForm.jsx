import { useState } from 'react'
import { Link } from 'react-router-dom'
import PasswordInput from './PasswordInput'
import PasswordStrength from './PasswordStrength'
import { FormError } from './AuthShell'
import { useToast } from './Toast'
import * as api from '../api/api'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const mismatch = confirm.length > 0 && confirm !== next

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) {
      setError('The two new passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      showToast('✓ Password updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm">
      <FormError>{error}</FormError>

      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <label htmlFor="current-password" className="block text-xs text-ink-muted">
            Current password
          </label>
          <Link to="/forgot-password" className="text-xs text-accent hover:underline">
            Forgot it?
          </Link>
        </div>
        <PasswordInput
          id="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value)
            setError(null)
          }}
          autoComplete="current-password"
          maxLength={200}
        />
      </div>

      <div className="mb-1">
        <label htmlFor="profile-new-password" className="block text-xs text-ink-muted mb-1">
          New password
        </label>
        <PasswordInput
          id="profile-new-password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value)
            setError(null)
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          describedBy="profile-new-password-strength"
        />
        <PasswordStrength id="profile-new-password-strength" password={next} />
      </div>

      <div className="mb-5">
        <label htmlFor="profile-confirm-password" className="block text-xs text-ink-muted mb-1">
          Confirm new password
        </label>
        <PasswordInput
          id="profile-confirm-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setError(null)
          }}
          placeholder="Type it again"
          autoComplete="new-password"
          describedBy="profile-confirm-hint"
        />
        <p
          id="profile-confirm-hint"
          className={`mt-1.5 text-xs h-4 ${mismatch ? 'text-hard' : 'text-easy'}`}
          aria-live="polite"
        >
          {confirm.length === 0 ? '' : mismatch ? 'Passwords do not match.' : 'Passwords match.'}
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
