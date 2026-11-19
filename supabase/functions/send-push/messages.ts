// What each notification says and where a tap leads. Pure, so it is unit-tested.
// `url` is relative to the app (https://.../gym-app/), '' = Today.

export interface PushMessage {
  title: string
  body: string
  url: string
  /** The service worker replaces a visible notification with the same tag. */
  tag: string
}

export type Preference = 'notify_nudges' | 'notify_friends' | 'notify_reactions'

export function nudgeMessage(from: string): PushMessage {
  return { title: `${from} nudged you`, body: 'Time to get off the couch and train.', url: '', tag: 'nudge' }
}

export function friendRequestMessage(from: string): PushMessage {
  return { title: 'New friend request', body: `${from} wants to be gym buddies.`, url: 'friends', tag: 'friend-request' }
}

export function friendAcceptedMessage(friend: string, friendId: string): PushMessage {
  return { title: `${friend} accepted`, body: 'You are gym buddies now.', url: `friends/${friendId}`, tag: `friend-${friendId}` }
}

/** "Ana, Marko and 2 others reacted to your Push workout." Names newest first. */
export function reactionMessage(names: readonly string[], dayName: string, postId: string): PushMessage | null {
  if (names.length === 0) return null
  const who =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names[0]}, ${names[1]} and ${names.length - 2} ${names.length === 3 ? 'other' : 'others'}`
  return { title: 'New reaction', body: `${who} reacted to your ${dayName} workout.`, url: `feed#post-${postId}`, tag: `post-${postId}` }
}

/** A Topic header value for a post: base64url-safe and at most 32 characters. */
export function postTopic(postId: string): string {
  return postId.replace(/-/g, '').slice(0, 32)
}

/** Compares two strings in time that does not depend on where they differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
