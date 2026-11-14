import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { MIN_PASSWORD, useAuth } from '../features/auth/auth-context'
import { Button, Field, Wordmark } from '../components/ui'

/** Shown after the user opens a reset-password link (they are signed in by the link). */
export function NewPasswordPage() {
  const { endRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password`)
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(/different from the old/i.test(error.message) ? 'Pick a password you have not used before' : error.message)
      return
    }
    endRecovery()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="animate-fade-up">
        <Wordmark className="text-3xl" />
        <h1 className="mt-8 text-4xl leading-tight font-black tracking-tight">Set a new password.</h1>
        <p className="mt-2 text-muted">You are almost back in. Choose a new password for your account.</p>
      </div>
      <form onSubmit={submit} className="mt-8 flex animate-fade-up flex-col gap-4" noValidate>
        <Field
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
        {error && (
          <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={!password} className="mt-2 w-full">
          Save password
        </Button>
        <Button type="button" variant="ghost" onClick={() => supabase.auth.signOut()}>
          Cancel
        </Button>
      </form>
    </main>
  )
}
