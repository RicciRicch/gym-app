import { useState } from 'react'
import { Flame } from '../../components/Flame'
import { Avatar, Button, DumbbellMark } from '../../components/ui'
import { inviteLink } from '../../lib/friends'
import { avatarPhotoUrl } from '../avatar/api'
import { useProfile } from '../auth/useProfile'
import { useBadges } from '../badges/api'
import { useStreak } from '../streak/api'
import { QrCode } from './QrCode'

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * The user's "gym pass": a membership card with their friend code and a QR code of
 * their invite link, plus buttons to share it. A friend scans it with their camera,
 * opens the link, or types the code.
 */
export function GymPass({ className = '' }: { className?: string }) {
  const { data: profile } = useProfile()
  const streak = useStreak()
  const badges = useBadges()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  if (!profile) return null

  const code = profile.friend_code
  const link = inviteLink(window.location.origin + import.meta.env.BASE_URL, code)
  const earned = badges?.filter((b) => b.earnedOn).length ?? 0

  const flash = (what: 'code' | 'link') => {
    setCopied(what)
    window.setTimeout(() => setCopied(null), 1600)
  }
  const copyCode = async () => (await copy(code)) && flash('code')
  const invite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gym App', text: `Train with me on Gym App. My code: ${code}`, url: link })
        return
      } catch (error) {
        // Closing the share sheet is not an error; anything else falls back to copying.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    if (await copy(link)) flash('link')
  }

  return (
    <section className={className} aria-label="Your gym pass">
      <div className="gym-pass relative overflow-hidden rounded-3xl border border-accent/30 p-5">
        <div className="flex items-center justify-between text-[11px] font-black tracking-[0.25em] text-accent uppercase">
          <span className="flex items-center gap-2">
            <DumbbellMark className="size-4" />
            Gym pass
          </span>
          <span className="text-muted">Member</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Avatar avatarKey={profile.avatar_key} photoUrl={avatarPhotoUrl(profile.avatar_path)} className="size-14 shrink-0 ring-2 ring-accent/60" />
              <div className="min-w-0">
                <p className="truncate text-xl leading-tight font-black">{profile.display_name}</p>
                <p className="truncate text-sm text-muted">@{profile.username}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-muted">
              <span className="flex items-center gap-1">
                <Flame level={streak?.level ?? 0} frozen={streak?.frozen} className="h-5" />
                {streak?.weeks ?? 0} wk
              </span>
              <span>🏅 {earned}</span>
            </div>
          </div>
          <QrCode value={link} label="QR code of your invite link" className="size-24 shrink-0 rounded-xl" />
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl border border-dashed border-accent/40 bg-black/25 px-4 transition active:scale-[0.98]"
          aria-label={`Your friend code ${code}. Tap to copy.`}
        >
          <span className="font-mono text-xl font-black tracking-[0.18em]">{code}</span>
          <span className="text-sm font-bold text-accent">{copied === 'code' ? 'Copied ✓' : 'Copy'}</span>
        </button>
      </div>

      <Button className="mt-3 w-full" onClick={invite}>
        {copied === 'link' ? 'Link copied ✓' : 'Invite a friend'}
      </Button>
      <p className="mt-2 text-center text-sm text-muted">Send the link, show the QR code, or tell them your code.</p>
    </section>
  )
}
