// A simple hint under a "new password" field. It looks only at length and
// variety, so it guides people without pretending to be a security audit.
// The server still enforces the real rule: 8 to 72 characters.

export function passwordLevel(password) {
  const length = password.length
  if (length === 0) return 0
  if (length < 8) return 1
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (length >= 12 || (length >= 10 && kinds >= 3)) return 3
  return 2
}

const LEVELS = [
  null,
  { label: 'Too short. Use at least 8 characters.', bar: 'bg-hard', text: 'text-hard' },
  { label: 'Okay. A longer password is safer.', bar: 'bg-medium', text: 'text-medium' },
  { label: 'Strong.', bar: 'bg-easy', text: 'text-easy' },
]

// variant "app" = dark app screens (Tailwind theme); "auth" = login-style screens (auth.css)
export default function PasswordStrength({ password, id, variant = 'app' }) {
  const level = passwordLevel(password)

  if (variant === 'auth') {
    return (
      <div id={id} className="au-strength" data-level={level} aria-live="polite">
        <div className="au-bars">
          <span />
          <span />
          <span />
        </div>
        <p className="au-strength-text">
          {level === 0 ? 'Longer passwords are safer.' : LEVELS[level].label}
        </p>
      </div>
    )
  }

  if (level === 0) {
    return (
      <div id={id} className="mt-2 h-[2.25rem]">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className="h-1 flex-1 rounded-full bg-base-border" />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">Longer passwords are safer.</p>
      </div>
    )
  }

  const info = LEVELS[level]
  return (
    <div id={id} className="mt-2 h-[2.25rem]" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= level ? info.bar : 'bg-base-border'
            }`}
          />
        ))}
      </div>
      <p className={`mt-1.5 text-xs ${info.text}`}>{info.label}</p>
    </div>
  )
}
