import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

const buttonVariants = {
  primary: 'bg-accent text-accent-ink font-bold hover:bg-accent-dim shadow-[0_0_24px_-6px] shadow-accent/50',
  secondary: 'bg-surface-2 text-text font-semibold border border-line hover:border-muted',
  ghost: 'text-muted font-semibold hover:text-text',
}

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  error?: string | null
  prefix?: string
}

export function Field({ label, hint, error, prefix, className = '', ...rest }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-2xl border bg-surface px-4 transition focus-within:border-accent ${error ? 'border-danger' : 'border-line'}`}
      >
        {prefix && <span className="mr-1 text-muted">{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className="min-h-12 w-full bg-transparent text-base text-text outline-none placeholder:text-muted/60"
          {...rest}
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-note`} className={`mt-1.5 text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-accent">
      <Spinner className="size-8" />
    </div>
  )
}

const avatarFallbacks: Record<string, string> = {
  'avatar-1': 'from-lime-300 to-emerald-500',
  'avatar-2': 'from-sky-300 to-indigo-500',
  'avatar-3': 'from-amber-300 to-rose-500',
  'avatar-4': 'from-fuchsia-300 to-violet-600',
}

/** Avatar from public/assets/avatars; falls back to a gradient until the image exists. */
export function Avatar({ avatarKey, className = 'size-10' }: { avatarKey: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        className={`inline-block rounded-full bg-gradient-to-br ${avatarFallbacks[avatarKey] ?? 'from-surface-2 to-line'} ${className}`}
      />
    )
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/avatars/${avatarKey}.webp`}
      alt=""
      onError={() => setFailed(true)}
      className={`rounded-full bg-surface-2 object-cover ${className}`}
    />
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-black tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-[1.1em] text-accent" aria-hidden="true">
        <rect x="1" y="11" width="5" height="10" rx="2" fill="currentColor" />
        <rect x="7" y="7" width="5" height="18" rx="2" fill="currentColor" />
        <rect x="12" y="14" width="8" height="4" fill="currentColor" />
        <rect x="20" y="7" width="5" height="18" rx="2" fill="currentColor" />
        <rect x="26" y="11" width="5" height="10" rx="2" fill="currentColor" />
      </svg>
      <span>
        GYM<span className="text-accent">APP</span>
      </span>
    </span>
  )
}
