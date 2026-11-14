import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/auth-context'
import { useProfile } from '../features/auth/useProfile'
import { Avatar, Button } from '../components/ui'
import { openGuide } from '../features/guide/guide-store'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
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
    </div>
  )
}
