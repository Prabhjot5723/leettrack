// Shared frame for the login, sign-up, forgot-password and reset-password screens.

export default function AuthShell({ children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-mono font-bold text-sm">
            {'{}'}
          </span>
          <span className="text-ink font-semibold tracking-tight text-lg">LeetTrack</span>
        </div>

        <div className="rounded-card border border-base-border bg-base-card p-6 shadow-card">
          {children}
        </div>

        {footer && <div className="text-sm text-ink-muted text-center mt-4">{footer}</div>}
      </div>
    </div>
  )
}

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