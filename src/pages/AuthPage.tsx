import { useState, type FormEvent } from 'react'
import { authLinkError, authRedirectUrl, authStorage, supabase } from '../lib/supabase'
import { MIN_PASSWORD } from '../features/auth/auth-context'
import { Button, Field, Wordmark } from '../components/ui'

type Mode = 'sign-in' | 'sign-up' | 'reset'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(() => linkErrorMessage(authLinkError))
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{
    to: string
    kind: 'confirm' | 'reset'
  } | null>(null)
  const [remember, setRemember] = useState(() => authStorage.remember())

  const isSignUp = mode === 'sign-up'
  const isReset = mode === 'reset'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (isSignUp && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password`)
      return
    }
    setBusy(true)
    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl(),
      })
      setBusy(false)
      if (error) setError(friendlyAuthError(error))
      else setSent({ to: email, kind: 'reset' })
      return
    }
    // Decide where the session is stored before Supabase writes it.
    authStorage.setRemember(remember)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        })
        if (error) throw error
        // With email confirmation on there is no session until the link is clicked.
        if (!data.session) setSent({ to: email, kind: 'confirm' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="animate-fade-up">
        <Wordmark className="text-3xl" />
        <h1 className="mt-8 text-4xl leading-tight font-black tracking-tight">
          {isSignUp ? 'Start lifting with a plan.' : isReset ? 'Reset your password.' : 'Welcome back.'}
        </h1>
        <p className="mt-2 text-muted">
          {isSignUp
            ? 'Create an account to build your split and track every set.'
            : isReset
              ? 'Enter your email and we will send you a link to set a new password.'
              : 'Log in to pick up where you left off.'}
        </p>
      </div>

      {sent ? (
        <div className="mt-8 animate-fade-up rounded-3xl border border-line bg-surface p-6" role="status">
          <h2 className="text-lg font-bold">Check your inbox</h2>
          <p className="mt-1 text-muted">
            {sent.kind === 'confirm' ? 'We sent a confirmation link to ' : 'We sent a password reset link to '}
            <span className="text-text">{sent.to}</span>.{' '}
            {sent.kind === 'confirm'
              ? 'Open it to finish creating your account.'
              : 'Open it on this device to set a new password.'}
          </p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => {
              setSent(null)
              switchMode('sign-in')
            }}
          >
            Back to log in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex animate-fade-up flex-col gap-4" noValidate>
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {!isReset && (
            <>
              <Field
                label="Password"
                type="password"
                name="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
              />
              <label className="-my-1 flex min-h-11 cursor-pointer items-center gap-3 self-start select-none">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="grid size-6 place-items-center rounded-lg border-2 border-line bg-surface text-accent-ink transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                >
                  {remember && (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium text-muted">Keep me logged in</span>
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy} disabled={!email || (!isReset && !password)} className="mt-2 w-full">
            {isSignUp ? 'Create account' : isReset ? 'Send reset link' : 'Log in'}
          </Button>
          {mode === 'sign-in' && (
            <Button type="button" variant="ghost" onClick={() => switchMode('reset')}>
              Forgot password?
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => switchMode(isSignUp || isReset ? 'sign-in' : 'sign-up')}>
            {isSignUp || isReset ? 'Back to log in' : 'New here? Create an account'}
          </Button>
        </form>
      )}
    </main>
  )
}

function linkErrorMessage(description: string | null): string | null {
  if (!description) return null
  if (/expired|invalid/i.test(description)) return 'That link has expired or was already used. Request a new one.'
  return description
}

function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first — check your inbox for the link'
  if (/already registered/i.test(message)) return 'An account with this email already exists'
  if (/rate limit/i.test(message))
    return 'Too many emails sent right now, so we could not send yours. Try again in an hour.'
  if (/failed to fetch|network/i.test(message)) return 'No connection — check your internet and try again'
  return message || 'Something went wrong — try again'
}
