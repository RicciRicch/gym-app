import { useState, type FormEvent } from 'react'
import { authRedirectUrl, supabase } from '../lib/supabase'
import { Button, Field, Wordmark } from '../components/ui'

type Mode = 'sign-in' | 'sign-up'

const MIN_PASSWORD = 8

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)

  const isSignUp = mode === 'sign-up'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (isSignUp && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password`)
      return
    }
    setBusy(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        })
        if (error) throw error
        // With email confirmation on there is no session until the link is clicked.
        if (!data.session) setConfirmSentTo(email)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
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
          {isSignUp ? 'Start lifting with a plan.' : 'Welcome back.'}
        </h1>
        <p className="mt-2 text-muted">
          {isSignUp ? 'Create an account to build your split and track every set.' : 'Log in to pick up where you left off.'}
        </p>
      </div>

      {confirmSentTo ? (
        <div className="mt-8 animate-fade-up rounded-3xl border border-line bg-surface p-6" role="status">
          <h2 className="text-lg font-bold">Check your inbox</h2>
          <p className="mt-1 text-muted">
            We sent a confirmation link to <span className="text-text">{confirmSentTo}</span>. Open it to finish creating your
            account.
          </p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => {
              setConfirmSentTo(null)
              setMode('sign-in')
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
          {error && (
            <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy} disabled={!email || !password} className="mt-2 w-full">
            {isSignUp ? 'Create account' : 'Log in'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMode(isSignUp ? 'sign-in' : 'sign-up')
              setError(null)
            }}
          >
            {isSignUp ? 'I already have an account' : 'New here? Create an account'}
          </Button>
        </form>
      )}
    </main>
  )
}

function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first — check your inbox for the link'
  if (/already registered/i.test(message)) return 'An account with this email already exists'
  if (/failed to fetch|network/i.test(message)) return 'No connection — check your internet and try again'
  return message || 'Something went wrong — try again'
}
