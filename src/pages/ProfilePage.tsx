import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/auth-context'
import { useProfile } from '../features/auth/useProfile'
import { Avatar, Button } from '../components/ui'
import { Sheet } from '../components/Sheet'
import { openGuide } from '../features/guide/guide-store'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!profile) return null

  return (
    <div className="flex animate-fade-up flex-col items-center pt-6 text-center">
      <Avatar avatarKey={profile.avatar_key} className="size-28 ring-4 ring-line" />
      <h1 className="mt-4 text-2xl font-black tracking-tight">{profile.display_name}</h1>
      <p className="text-muted">@{profile.username}</p>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>
      <Button variant="secondary" className="mt-8 w-full" onClick={() => user && openGuide(user.id)}>
        How to use the app
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => supabase.auth.signOut()}>
        Log out
      </Button>
      <button onClick={() => setConfirmDelete(true)} className="mt-10 min-h-11 px-4 text-sm font-semibold text-danger/80">
        Delete account
      </button>
      {confirmDelete && user && <DeleteAccountSheet userId={user.id} onClose={() => setConfirmDelete(false)} />}
    </div>
  )
}

function DeleteAccountSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteAccount() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      setBusy(false)
      setError('Could not delete your account. Check your connection and try again.')
      return
    }
    // The account is gone; drop this user's local leftovers and the stale session.
    try {
      for (const key of Object.keys(localStorage)) if (key.endsWith(userId)) localStorage.removeItem(key)
    } catch {
      /* storage blocked: nothing to clean */
    }
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <Sheet title="Delete your account?" onClose={busy ? () => {} : onClose}>
      <p className="text-muted">
        This permanently deletes your profile, split, every logged workout and your custom exercises. It cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="danger" className="w-full" loading={busy} onClick={deleteAccount}>
          Delete forever
        </Button>
        <Button variant="ghost" className="w-full" disabled={busy} onClick={onClose}>
          Keep my account
        </Button>
      </div>
    </Sheet>
  )
}
