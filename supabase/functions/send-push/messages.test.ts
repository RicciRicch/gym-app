import { describe, expect, it } from 'vitest'
import {
  friendAcceptedMessage,
  friendRequestMessage,
  nudgeMessage,
  postTopic,
  reactionMessage,
  reminderMessage,
  safeEqual,
  streakMessage,
  weekdayName,
} from './messages'

describe('push messages', () => {
  it('words nudges and friend requests', () => {
    expect(nudgeMessage('Ana')).toMatchObject({ title: 'Ana nudged you', url: '' })
    expect(friendRequestMessage('Marko').body).toBe('Marko wants to be gym buddies.')
    expect(friendAcceptedMessage('Iva', 'abc')).toMatchObject({ title: 'Iva accepted', url: 'friends/abc' })
  })

  it('folds reactions on one post into one line', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    expect(reactionMessage([], 'Push', id)).toBeNull()
    expect(reactionMessage(['Ana'], 'Push', id)?.body).toBe('Ana reacted to your Push workout.')
    expect(reactionMessage(['Ana', 'Marko'], 'Push', id)?.body).toBe('Ana and Marko reacted to your Push workout.')
    expect(reactionMessage(['Ana', 'Marko', 'Iva'], 'Legs', id)?.body).toBe('Ana, Marko and 1 other reacted to your Legs workout.')
    expect(reactionMessage(['Ana', 'Marko', 'Iva', 'Luka'], 'Legs', id)?.body).toBe('Ana, Marko and 2 others reacted to your Legs workout.')
    expect(reactionMessage(['Ana'], 'Push', id)).toMatchObject({ url: `feed#post-${id}`, tag: `post-${id}` })
  })

  it('words workout reminders', () => {
    expect(reminderMessage('Push', null)).toMatchObject({ title: 'Push day', url: '', tag: 'reminder' })
    expect(reminderMessage('Push', null).body).toBe('Your Push workout is on today. Tap to start when you are ready.')
    // 2026-11-17 was a Tuesday.
    expect(reminderMessage('Legs', '2026-11-17').body).toBe('Your Legs workout has been waiting since Tuesday. Today works.')
    expect(weekdayName('2026-11-22')).toBe('Sunday')
  })

  it('warns when the streak needs every day left', () => {
    expect(streakMessage(5, 1, null)).toMatchObject({
      title: 'Your streak needs you',
      body: 'One workout today keeps your 5-week streak alive. Last chance this week.',
    })
    expect(streakMessage(3, 2, 'Pull')).toMatchObject({
      title: 'Pull day: your streak needs it',
      body: '2 workouts in 2 days keep your 3-week streak alive. Start today.',
    })
  })

  it('makes a valid Topic from a post id', () => {
    expect(postTopic('11111111-2222-3333-4444-555555555555')).toMatch(/^[A-Za-z0-9_-]{1,32}$/)
  })

  it('compares secrets strictly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', '')).toBe(false)
  })
})
