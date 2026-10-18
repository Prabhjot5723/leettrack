import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthShell, { FormError, fieldInputClass, primaryButtonClass } from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import PasswordStrength from '../components/PasswordStrength'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
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

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setPassword('')
    setConfirm('')
    setError(null)
  }

  return (
    <AuthShell
      footer={
        <>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={switchMode} className="text-accent hover:underline">
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <h1 className="text-lg font-semibold text-ink mb-1">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-ink-muted mb-5">
          {isRegister
            ? 'Start tracking your DSA practice and revisions.'
            : 'Log in to see your daily plan.'}
        </p>

        <FormError>{error}</FormError>

        {isRegister && (
          <div className="mb-3">
            <label htmlFor="username" className="block text-xs text-ink-muted mb-1">
              Username
            </label>
            <input
              id="username"
              className={fieldInputClass}
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

        <div className="mb-3">
          <label htmlFor="email" className="block text-xs text-ink-muted mb-1">
            {isRegister ? 'Email' : 'Email or username'}
          </label>
          <input
            id="email"
            type={isRegister ? 'email' : 'text'}
            className={fieldInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isRegister ? 'you@example.com' : 'you@example.com or username'}
            autoComplete={isRegister ? 'email' : 'username'}
            required
          />
        </div>

        <div className={isRegister ? 'mb-1' : 'mb-5'}>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="password" className="block text-xs text-ink-muted">
              Password
            </label>
            {!isRegister && (
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <PasswordInput
            id="password"
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
          {isRegister && <PasswordStrength id="password-strength" password={password} />}
        </div>

        {isRegister && (
          <div className="mb-5">
            <label htmlFor="confirm" className="block text-xs text-ink-muted mb-1">
              Confirm password
            </label>
            <PasswordInput
              id="confirm"
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
        )}

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  )
}
