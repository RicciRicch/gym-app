import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/auth-context'
import { useProfile } from '../features/auth/useProfile'
import { Avatar, Button } from '../components/ui'
import { Sheet } from '../components/Sheet'
import { openGuide } from '../features/guide/guide-store'
import { AvatarPicker } from '../features/avatar/AvatarPicker'
import { BadgeShelfCard } from '../features/badges/BadgeShelfCard'
import { useFriends } from '../features/friends/api'
import { avatarPhotoUrl, choiceFromProfile, useUpdateAvatar, type AvatarChoice } from '../features/avatar/api'
import type { Database } from '../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editAvatar, setEditAvatar] = useState(false)
  const friends = useFriends().data
  if (!profile) return null
  const friendCount = friends?.filter((f) => f.status === 'accepted').length ?? 0
  const requestCount = friends?.filter((f) => f.status === 'incoming').length ?? 0

  return (
    <div className="flex animate-fade-up flex-col items-center pt-6 text-center">
      <button
        type="button"
        onClick={() => setEditAvatar(true)}
        className="relative rounded-full transition active:scale-95"
        aria-label="Change avatar"
      >
        <Avatar avatarKey={profile.avatar_key} photoUrl={avatarPhotoUrl(profile.avatar_path)} className="size-28 ring-4 ring-line" />
        <span className="absolute right-0 bottom-0 grid size-9 place-items-center rounded-full border-4 border-bg bg-accent text-accent-ink">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <h1 className="mt-4 text-2xl font-black tracking-tight">{profile.display_name}</h1>
      <p className="text-muted">@{profile.username}</p>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>
      <BadgeShelfCard className="mt-6" />
      <Link
        to="/friends"
        className="mt-3 flex w-full items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3.5 text-left transition active:scale-[0.98]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-bold">Friends</p>
          <p className="text-sm text-muted">
            {friendCount === 0 ? 'Add a gym buddy with your pass' : `${friendCount} ${friendCount === 1 ? 'friend' : 'friends'}`}
          </p>
        </div>
        {requestCount > 0 && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-black text-accent-ink">{requestCount} new</span>
        )}
        <span className="font-mono text-sm font-bold tracking-widest text-muted">{profile.friend_code}</span>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => user && openGuide(user.id)}>
        How to use the app
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => supabase.auth.signOut()}>
        Log out
      </Button>
      <button onClick={() => setConfirmDelete(true)} className="mt-10 min-h-11 px-4 text-sm font-semibold text-danger/80">
        Delete account
      </button>
      {editAvatar && <ChangeAvatarSheet profile={profile} onClose={() => setEditAvatar(false)} />}
      {confirmDelete && user && <DeleteAccountSheet userId={user.id} onClose={() => setConfirmDelete(false)} />}
    </div>
  )
}

function ChangeAvatarSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [choice, setChoice] = useState<AvatarChoice>(() => choiceFromProfile(profile))
  const update = useUpdateAvatar()
  const unchanged =
    choice.usePhoto && choice.photo
      ? 'path' in choice.photo && choice.photo.path === profile.avatar_path
      : !profile.avatar_path && choice.preset === profile.avatar_key

  return (
    <Sheet title="Change avatar" onClose={update.isPending ? () => {} : onClose}>
      <AvatarPicker value={choice} onChange={setChoice} />
      {update.isError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not save your avatar. Check your connection and try again.
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <Button
          className="w-full"
          loading={update.isPending}
          disabled={unchanged}
          onClick={() => update.mutate({ choice, previousPath: profile.avatar_path }, { onSuccess: onClose })}
        >
          Save
        </Button>
        <Button variant="ghost" className="w-full" disabled={update.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
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
