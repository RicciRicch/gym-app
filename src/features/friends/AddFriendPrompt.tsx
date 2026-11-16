import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button, Spinner } from '../../components/ui'
import { avatarPhotoUrl } from '../avatar/api'
import { useFriendPreview, useSendFriendRequest } from './api'
import { FistBump, type Buddy } from './FistBump'
import { clearInvite, usePendingInvite } from './invite-store'

/**
 * Asks "Add this person?" for the pending friend code (from an invite link or typed
 * on the Friends page). Mounted once in the app shell.
 */
export function AddFriendPrompt() {
  const code = usePendingInvite()
  const [bumped, setBumped] = useState<Buddy | null>(null)

  if (bumped) return <FistBump buddy={bumped} onClose={() => setBumped(null)} />
  if (!code) return null
  return (
    <InviteSheet
      key={code}
      code={code}
      onFriends={(buddy) => {
        clearInvite()
        setBumped(buddy)
      }}
    />
  )
}

function InviteSheet({ code, onFriends }: { code: string; onFriends: (buddy: Buddy) => void }) {
  const preview = useFriendPreview(code)
  const send = useSendFriendRequest()
  const [sent, setSent] = useState(false)
  const person = preview.data
  const relation = sent ? 'sent' : person?.relation

  const add = () =>
    person &&
    send.mutate(code, {
      onSuccess: (result) => {
        if (result === 'sent') setSent(true)
        else onFriends({ name: person.display_name, avatarKey: person.avatar_key, avatarPath: person.avatar_path })
      },
    })

  return (
    <Sheet title="Add a friend" onClose={send.isPending ? () => {} : clearInvite}>
      {preview.isPending ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : preview.isError ? (
        <Message text="Could not look up that code. Check your connection.">
          <Button variant="secondary" className="w-full" onClick={() => preview.refetch()}>
            Try again
          </Button>
        </Message>
      ) : !person ? (
        <Message text={`Nobody has the code ${code}. Check it with your friend.`} />
      ) : (
        <div className="flex flex-col items-center pb-2 text-center">
          <Avatar avatarKey={person.avatar_key} photoUrl={avatarPhotoUrl(person.avatar_path)} className="size-24 ring-4 ring-line" />
          <p className="mt-3 text-2xl font-black tracking-tight">{person.display_name}</p>
          <p className="font-mono text-sm tracking-widest text-muted">{code}</p>

          {relation === 'self' && <p className="mt-4 text-muted">That&apos;s your own code. Send it to a friend instead.</p>}
          {relation === 'friends' && <p className="mt-4 text-muted">You are already friends.</p>}
          {relation === 'sent' && (
            <p className="mt-4 font-semibold text-accent">Request sent ✓ {person.display_name} has to accept it.</p>
          )}
          {relation === 'received' && <p className="mt-4 text-muted">{person.display_name} already asked to be your friend.</p>}
          {relation === 'none' && <p className="mt-4 text-muted">You will see each other&apos;s streak, badges and weekly sets. No weights.</p>}

          {send.isError && (
            <p role="alert" className="mt-4 w-full rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              Could not send the request. Try again.
            </p>
          )}

          <div className="mt-5 flex w-full flex-col gap-2">
            {(relation === 'none' || relation === 'received') && (
              <Button className="w-full" loading={send.isPending} onClick={add}>
                {relation === 'received' ? 'Accept' : 'Add friend'}
              </Button>
            )}
            <Button variant="ghost" className="w-full" disabled={send.isPending} onClick={clearInvite}>
              {relation === 'none' || relation === 'received' ? 'Not now' : 'Close'}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function Message({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="pb-2">
      <p className="py-4 text-muted">{text}</p>
      <div className="flex flex-col gap-2">
        {children}
        <Button variant="ghost" className="w-full" onClick={clearInvite}>
          Close
        </Button>
      </div>
    </div>
  )
}
