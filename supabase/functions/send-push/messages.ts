// What each notification says and where a tap leads. Pure, so it is unit-tested.
// `url` is relative to the app (https://.../gym-app/), '' = Today.

export interface PushMessage {
  title: string
  body: string
  url: string
  /** The service worker replaces a visible notification with the same tag. */
  tag: string
  /** Vibration pattern (ms) for phones that honour it. */
  vibrate?: number[]
}

export const REST_BUZZ = [300, 150, 300, 150, 300]

/** The rest between sets is over (the app left an alarm when the set was done). */
export function restMessage(): PushMessage {
  return { title: 'Rest is over', body: 'Time for your next set.', url: 'workout', tag: 'rest', vibrate: REST_BUZZ }
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The weekday of a local YYYY-MM-DD date. */
export function weekdayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** The planned day has come and nothing is logged yet. `waitingSince`: rotating plan, missed earlier. */
export function reminderMessage(dayName: string, waitingSince: string | null): PushMessage {
  return {
    title: `${dayName} day`,
    body: waitingSince
      ? `Your ${dayName} workout has been waiting since ${weekdayName(waitingSince)}. Today works.`
      : `Your ${dayName} workout is on today. Tap to start when you are ready.`,
    url: '',
    tag: 'reminder',
  }
}

/** Every day left this week needs a workout (needed = days left), or the streak ends on Sunday. */
export function streakMessage(weeks: number, needed: number, dayName: string | null): PushMessage {
  const streak = `${weeks}-week streak`
  const body =
    needed <= 1
      ? `One workout today keeps your ${streak} alive. Last chance this week.`
      : `${needed} workouts in ${needed} days keep your ${streak} alive. Start today.`
  return {
    title: dayName ? `${dayName} day: your streak needs it` : 'Your streak needs you',
    body,
    url: '',
    tag: 'reminder',
  }
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
