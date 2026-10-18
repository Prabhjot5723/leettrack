import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthShell, { AuthError } from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import PasswordStrength from '../components/PasswordStrength'

export default function Login() {
  const { login, register } = useAuth()
  // The front page's "Create account" button opens this screen as /login?mode=register.
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login'
  ) // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'
  const mismatch = isRegister && confirm.length > 0 && confirm !== password

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (isRegister && password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      if (isRegister) {
        await register(username, email, password)
      } else {
        await login(email, password)
      }
      // On success AuthContext sets the user and the router shows the app.
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  function chooseMode(next) {
    if (next === mode) return
    setMode(next)
    setPassword('')
    setConfirm('')
    setError(null)
  }

  return (
    <AuthShell>
      <div className="au-tabs" role="group" aria-label="Log in or sign up">
        <button
          type="button"
          className="au-tab"
          aria-pressed={!isRegister}
          onClick={() => chooseMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          className="au-tab"
          aria-pressed={isRegister}
          onClick={() => chooseMode('register')}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <h1 className="au-h1">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="au-sub">
          {isRegister
            ? 'Start tracking your DSA practice and revisions.'
            : 'Log in to see your daily plan.'}
        </p>

        <AuthError>{error}</AuthError>

        {isRegister && (
          <div className="au-field">
            <label htmlFor="username" className="au-label">
              Username
            </label>
            <input
              id="username"
              className="au-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="prabhjot"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_.\-]{3,30}"
              title="3-30 characters: letters, numbers, dot, dash or underscore"
            />
          </div>
        )}

        <div className="au-field">
          <label htmlFor="email" className="au-label">
            {isRegister ? 'Email' : 'Email or username'}
          </label>
          <input
            id="email"
            type={isRegister ? 'email' : 'text'}
            className="au-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isRegister ? 'you@example.com' : 'you@example.com or username'}
            autoComplete={isRegister ? 'email' : 'username'}
            required
          />
        </div>

        <div className="au-field">
          <div className="au-label-row">
            <label htmlFor="password" className="au-label">
              Password
            </label>
            {!isRegister && (
              <Link to="/forgot-password" className="au-small-link">
                Forgot password?
              </Link>
            )}
          </div>
          <PasswordInput
            id="password"
            variant="auth"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            describedBy={isRegister ? 'password-strength' : undefined}
          />
          {isRegister && (
            <PasswordStrength id="password-strength" variant="auth" password={password} />
          )}
        </div>

        {isRegister && (
          <div className="au-field">
            <label htmlFor="confirm" className="au-label">
              Confirm password
            </label>
            <PasswordInput
              id="confirm"
              variant="auth"
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
              className={`au-hint ${mismatch ? 'is-bad' : 'is-ok'}`}
              aria-live="polite"
            >
              {confirm.length === 0 ? '' : mismatch ? 'Passwords do not match.' : 'Passwords match.'}
            </p>
          </div>
        )}

        <button type="submit" disabled={submitting} className="au-btn au-btn-primary">
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  )
}
