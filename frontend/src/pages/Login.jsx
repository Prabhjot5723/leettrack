import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
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
    setError(null)
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg bg-base border border-base-border text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent'

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-mono font-bold text-sm">
            {'{}'}
          </span>
          <span className="text-ink font-semibold tracking-tight text-lg">LeetTrack</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-base-border bg-base-card p-6 shadow-card"
        >
          <h1 className="text-lg font-semibold text-ink mb-1">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-ink-muted mb-5">
            {isRegister
              ? 'Start tracking your DSA practice and revisions.'
              : 'Log in to see your daily plan.'}
          </p>

          {error && (
            <div className="rounded-lg border border-hard/30 bg-hard-bg px-3 py-2 mb-4 text-sm text-hard">
              {error}
            </div>
          )}

          {isRegister && (
            <div className="mb-3">
              <label htmlFor="username" className="block text-xs text-ink-muted mb-1">
                Username
              </label>
              <input
                id="username"
                className={inputClass}
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
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRegister ? 'you@example.com' : 'you@example.com or username'}
              autoComplete={isRegister ? 'email' : 'username'}
              required
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="block text-xs text-ink-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-ink-muted text-center mt-4">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={switchMode} className="text-accent hover:underline">
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
