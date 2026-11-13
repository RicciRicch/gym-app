import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar, Button, Field } from '../components/ui'
import { AVATAR_KEYS, USERNAME_PATTERN, UsernameTakenError, useCreateProfile } from '../features/auth/useProfile'

export function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarKey, setAvatarKey] = useState<string>(AVATAR_KEYS[0])
  const [touched, setTouched] = useState(false)
  const createProfile = useCreateProfile()

  const usernameValid = USERNAME_PATTERN.test(username)
  const usernameError =
    createProfile.error instanceof UsernameTakenError
      ? createProfile.error.message
      : touched && !usernameValid
        ? '3–20 characters: lowercase letters, numbers and _'
        : null
  const otherError =
    createProfile.error && !(createProfile.error instanceof UsernameTakenError)
      ? 'Could not save your profile — try again'
      : null

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!usernameValid || !displayName.trim()) return
    createProfile.mutate({ username, display_name: displayName.trim(), avatar_key: avatarKey })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      <div className="animate-fade-up">
        <p className="text-sm font-semibold tracking-widest text-accent uppercase">Step 1 of 1</p>
        <h1 className="mt-2 text-4xl leading-tight font-black tracking-tight">Set up your profile</h1>
        <p className="mt-2 text-muted">Pick a look and a name. You can lift right after.</p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-1 animate-fade-up flex-col gap-5" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">Avatar</legend>
          <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Avatar">
            {AVATAR_KEYS.map((key, i) => {
              const selected = key === avatarKey
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Avatar ${i + 1}`}
                  onClick={() => setAvatarKey(key)}
                  className={`grid aspect-square place-items-center rounded-3xl border-2 bg-surface p-2 transition active:scale-95 ${selected ? 'animate-pop border-accent shadow-[0_0_24px_-8px] shadow-accent' : 'border-line opacity-70'}`}
                >
                  <Avatar avatarKey={key} className="size-full" />
                </button>
              )
            })}
          </div>
        </fieldset>

        <Field
          label="Username"
          name="username"
          prefix="@"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
            createProfile.reset()
          }}
          onBlur={() => setTouched(true)}
          error={usernameError}
          hint="Unique. This is how friends will find you later."
          placeholder="ironmike"
        />
        <Field
          label="Display name"
          name="display_name"
          autoComplete="name"
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Mike"
        />

        {otherError && (
          <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {otherError}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Button type="submit" loading={createProfile.isPending} disabled={!username || !displayName.trim()}>
            Let&apos;s go
          </Button>
          <Button type="button" variant="ghost" onClick={() => supabase.auth.signOut()}>
            Log out
          </Button>
        </div>
      </form>
    </main>
  )
}
