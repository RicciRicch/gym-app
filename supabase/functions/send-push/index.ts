// Sends a push notification for something that just happened in the database.
// Called only by the triggers in the `push_notifications` migration and the
// reminder job in `push_reminders` (through pg_net), which prove themselves with
// the shared secret kept in Vault; there is no user JWT, so verify_jwt is off and
// the secret is the gate.
//
// Body: { kind: 'nudge' | 'friend_request' | 'friend_accepted', id } or
//       { kind: 'reaction', post_id, user_id } or
//       { kind: 'reminder' | 'streak', user_id, day_name, waiting_since, streak_weeks, needed, days_left }
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  friendAcceptedMessage,
  friendRequestMessage,
  nudgeMessage,
  postTopic,
  reactionMessage,
  reminderMessage,
  safeEqual,
  streakMessage,
  type Preference,
  type PushMessage,
} from './messages.ts'
import { sendPush, type VapidKeys } from './webpush.ts'

interface Target {
  userId: string
  /** The recipient's switch for this kind; none when the caller already checked it. */
  preference?: Preference
  message: PushMessage
  topic?: string
  /** Seconds a push service keeps it for an offline phone (default a day). */
  ttl?: number
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function nameOf(db: SupabaseClient, id: string): Promise<string> {
  const { data } = await db.from('profiles').select('display_name').eq('id', id).maybeSingle()
  return data?.display_name ?? 'A friend'
}

/** Who gets what for this event; null when nobody should be notified. */
async function resolve(db: SupabaseClient, event: Record<string, unknown>): Promise<Target | null> {
  const id = typeof event.id === 'string' ? event.id : ''
  switch (event.kind) {
    case 'nudge': {
      const { data } = await db.from('nudges').select('from_id, to_id').eq('id', id).maybeSingle()
      if (!data) return null
      return { userId: data.to_id, preference: 'notify_nudges', message: nudgeMessage(await nameOf(db, data.from_id)) }
    }
    case 'friend_request': {
      const { data } = await db.from('friendships').select('requester_id, addressee_id, status').eq('id', id).maybeSingle()
      if (!data || data.status !== 'pending') return null
      return { userId: data.addressee_id, preference: 'notify_friends', message: friendRequestMessage(await nameOf(db, data.requester_id)) }
    }
    case 'friend_accepted': {
      const { data } = await db.from('friendships').select('requester_id, addressee_id, status').eq('id', id).maybeSingle()
      if (!data || data.status !== 'accepted') return null
      return {
        userId: data.requester_id,
        preference: 'notify_friends',
        message: friendAcceptedMessage(await nameOf(db, data.addressee_id), data.addressee_id),
      }
    }
    case 'reaction': {
      const postId = typeof event.post_id === 'string' ? event.post_id : ''
      const { data: post } = await db.from('workout_posts').select('user_id, day_name').eq('id', postId).maybeSingle()
      if (!post || post.user_id === event.user_id) return null
      // Everyone who reacted in the last hour, newest first, in one line.
      const since = new Date(Date.now() - 3600_000).toISOString()
      const { data: reactions } = await db
        .from('post_reactions')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
      const ids = (reactions ?? []).map((r) => r.user_id).filter((u) => u !== post.user_id)
      const names = await Promise.all(ids.map((u) => nameOf(db, u)))
      const message = reactionMessage(names, post.day_name, postId)
      return message && { userId: post.user_id, preference: 'notify_reactions', message, topic: postTopic(postId) }
    }
    // From the reminder job, which already checked the settings, the plan and the time.
    case 'reminder':
    case 'streak': {
      const userId = typeof event.user_id === 'string' ? event.user_id : ''
      if (!userId) return null
      const dayName = typeof event.day_name === 'string' && event.day_name ? event.day_name : null
      const waitingSince = typeof event.waiting_since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.waiting_since) ? event.waiting_since : null
      // A reminder that arrives hours late (phone off) is noise: let it expire.
      const ttl = 2 * 3600
      if (event.kind === 'reminder') return dayName ? { userId, message: reminderMessage(dayName, waitingSince), ttl } : null
      const weeks = Number(event.streak_weeks)
      const needed = Number(event.needed)
      if (!(weeks > 0) || !(needed > 0)) return null
      return { userId, message: streakMessage(weeks, needed, dayName), ttl }
    }
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: config, error } = await db.rpc('push_config').single<{
    vapid_public_key: string | null
    vapid_private_key: string | null
    vapid_subject: string | null
    webhook_secret: string | null
  }>()
  if (error || !config?.webhook_secret || !config.vapid_public_key || !config.vapid_private_key) {
    return json({ error: 'Push is not set up' }, 503)
  }
  if (!safeEqual(req.headers.get('x-push-secret') ?? '', config.webhook_secret)) return json({ error: 'Forbidden' }, 403)

  let event: Record<string, unknown>
  try {
    event = await req.json()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }

  const target = await resolve(db, event)
  if (!target) return json({ sent: 0, skipped: 'nothing to send' })

  if (target.preference) {
    const { data: profile } = await db.from('profiles').select(target.preference).eq('id', target.userId).maybeSingle()
    if (!profile || !(profile as Record<string, boolean>)[target.preference]) return json({ sent: 0, skipped: 'turned off' })
  }

  const { data: subscriptions } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', target.userId)
  const vapid: VapidKeys = {
    publicKey: config.vapid_public_key,
    privateKey: config.vapid_private_key,
    subject: config.vapid_subject ?? 'https://ricciricch.github.io/gym-app/',
  }

  const statuses: number[] = []
  for (const sub of subscriptions ?? []) {
    let status = 0
    try {
      status = await sendPush(sub, target.message, vapid, { topic: target.topic, ttl: target.ttl, urgency: target.preference === 'notify_nudges' ? 'high' : 'normal' })
    } catch {
      status = 0
    }
    statuses.push(status)
    // The browser unsubscribed or the app was removed: forget this device.
    if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', sub.id)
  }
  return json({ sent: statuses.filter((s) => s >= 200 && s < 300).length, statuses })
})
