import { useState } from 'react'

const appInputClass =
  'w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-base border border-base-border text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent'

// "app" = the dark app screens (Tailwind theme). "auth" = the login-style screens (auth.css).
const CLASSES = {
  app: {
    wrap: 'relative',
    input: appInputClass,
    eye: 'absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-lg text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:text-accent focus-visible:bg-accent-muted/40 transition-colors',
    caps: 'mt-1.5 text-xs text-medium',
  },
  auth: {
    wrap: 'au-pw',
    input: 'au-input',
    eye: 'au-eye',
    caps: 'au-caps',
  },
}

function EyeIcon({ crossed }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  )
}

// Password field with a show/hide button. Drop-in replacement for
// <input type="password">: same props, plus a Caps Lock warning.
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  minLength,
  maxLength = 72,
  autoFocus = false,
  describedBy,
  variant = 'app',
}) {
  const [visible, setVisible] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const cls = CLASSES[variant] || CLASSES.app

  function checkCaps(e) {
    if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'))
  }

  return (
    <div>
      <div className={cls.wrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={cls.input}
          value={value}
          onChange={onChange}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCapsOn(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          aria-describedby={describedBy}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className={cls.eye}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {capsOn && (
        <p className={cls.caps} role="status">
          Caps Lock is on.
        </p>
      )}
    </div>
  )
}
