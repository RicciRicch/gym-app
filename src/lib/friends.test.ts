import { describe, expect, it } from 'vitest'
import {
  canNudge,
  inviteLink,
  lastWorkoutLabel,
  liveStreak,
  nudgeLine,
  parseFriendCode,
  tableLine,
  togetherLine,
  weeklyTable,
  withNames,
  workoutsTogether,
} from './friends'

describe('parseFriendCode', () => {
  it('reads the code however it is typed', () => {
    expect(parseFriendCode('GORILA-4X2P')).toBe('GORILA-4X2P')
    expect(parseFriendCode('  gorila 4x2p ')).toBe('GORILA-4X2P')
    expect(parseFriendCode('4x2p')).toBe('GORILA-4X2P')
    expect(parseFriendCode('https://ricciricch.github.io/gym-app/?add=GORILA-4X2P')).toBe('GORILA-4X2P')
    expect(parseFriendCode('https://x.test/gym-app/?foo=1&add=gorila-4x2p#top')).toBe('GORILA-4X2P')
  })
  it('rejects anything else', () => {
    expect(parseFriendCode('')).toBeNull()
    expect(parseFriendCode('GORILA-12')).toBeNull()
    expect(parseFriendCode('GORILA-4X2PQ')).toBeNull()
    // 0, 1, I and O are never in a code.
    expect(parseFriendCode('GORILA-10IO')).toBeNull()
    expect(parseFriendCode('marko')).toBeNull()
  })
  it('round-trips through the invite link', () => {
    const link = inviteLink('https://ricciricch.github.io/gym-app/', 'GORILA-4X2P')
    expect(link).toBe('https://ricciricch.github.io/gym-app/?add=GORILA-4X2P')
    expect(parseFriendCode(link)).toBe('GORILA-4X2P')
  })
})

describe('liveStreak', () => {
  // 2026-11-16 is a Monday.
  it('trusts a streak published this week or last week', () => {
    expect(liveStreak(5, '2026-11-16', '2026-11-18')).toBe(5)
    expect(liveStreak(5, '2026-11-09', '2026-11-18')).toBe(5)
    expect(liveStreak(5, '2026-11-02', '2026-11-18')).toBe(0)
    expect(liveStreak(null, null, '2026-11-18')).toBe(0)
  })
})

describe('lastWorkoutLabel', () => {
  it('says what and when', () => {
    expect(lastWorkoutLabel('2026-11-16', 'Push', '2026-11-16')).toBe('Push · today')
    expect(lastWorkoutLabel('2026-11-15', 'Push', '2026-11-16')).toBe('Push · yesterday')
    expect(lastWorkoutLabel('2026-11-12', 'Legs', '2026-11-16')).toBe('Legs · 4 days ago')
    expect(lastWorkoutLabel('2026-10-01', 'Legs', '2026-11-16')).toBe('Legs · 1 Oct')
    expect(lastWorkoutLabel(null, null, '2026-11-16')).toBe('No workouts yet')
  })
})

describe('weeklyTable', () => {
  const entries = [
    { id: 'me', name: 'Dusan', days: 2, sets: 30, me: true },
    { id: 'a', name: 'Ana', days: 3, sets: 45 },
    { id: 'm', name: 'Marko', days: 2, sets: 30 },
    { id: 'z', name: 'Zika', days: 0, sets: 0 },
  ]
  it('ranks by sets, then days, sharing places on a tie', () => {
    expect(weeklyTable(entries).map((r) => [r.name, r.place])).toEqual([
      ['Ana', 1],
      ['Dusan', 2],
      ['Marko', 2],
      ['Zika', 4],
    ])
  })
  it('puts the user first among equals', () => {
    const tied = weeklyTable([
      { id: 'a', name: 'Ana', days: 0, sets: 0 },
      { id: 'me', name: 'You', days: 0, sets: 0, me: true },
    ])
    expect(tied.map((r) => [r.name, r.place])).toEqual([
      ['You', 1],
      ['Ana', 1],
    ])
  })
  it('has a line for every position', () => {
    const today = '2026-11-16'
    expect(tableLine(weeklyTable(entries), today)).toMatch(/Ana leads by 15 sets|crown is 15 sets away/)
    expect(tableLine(weeklyTable(entries.map((e) => ({ ...e, me: e.id === 'a' }))), today)).toMatch(/on top|First place/)
    expect(tableLine(weeklyTable(entries.map((e) => ({ ...e, me: e.id === 'z' }))), today)).toMatch(/Last place|from below/)
    expect(tableLine(weeklyTable(entries.map((e) => ({ ...e, sets: 0, days: 0 }))), today)).toMatch(/couches|Zero sets/)
    expect(tableLine(weeklyTable([entries[0]]), today)).toBe('')
  })
})

describe('nudges', () => {
  it('names who nudged', () => {
    expect(nudgeLine([], '2026-11-16')).toBe('')
    expect(nudgeLine(['Marko'], '2026-11-16')).toContain('Marko')
    expect(nudgeLine(['Marko', 'Ana'], '2026-11-16')).toContain('Marko and Ana')
    expect(nudgeLine(['Marko', 'Ana', 'Zika'], '2026-11-16')).toContain('Marko and 2 others')
  })
  it('allows one a day, not after they trained today', () => {
    expect(canNudge('2026-11-15', false, '2026-11-16')).toBe(true)
    expect(canNudge(null, false, '2026-11-16')).toBe(true)
    expect(canNudge('2026-11-15', true, '2026-11-16')).toBe(false)
    expect(canNudge('2026-11-16', false, '2026-11-16')).toBe(false)
  })
})

describe('training together', () => {
  it('counts days per friend once, whoever tagged', () => {
    const rows = [
      { userId: 'me', friendId: 'ana', day: '2026-11-10' },
      { userId: 'ana', friendId: 'me', day: '2026-11-10' },
      { userId: 'ana', friendId: 'me', day: '2026-11-12' },
      { userId: 'me', friendId: 'marko', day: '2026-11-03' },
      { userId: 'ana', friendId: 'marko', day: '2026-11-04' },
    ]
    const together = workoutsTogether(rows, 'me')
    expect(together.get('ana')).toEqual({ count: 2, lastDay: '2026-11-12' })
    expect(together.get('marko')).toEqual({ count: 1, lastDay: '2026-11-03' })
    expect(together.size).toBe(2)
  })
  it('names the partners', () => {
    expect(withNames([])).toBe('')
    expect(withNames(['Ana'])).toBe('With Ana')
    expect(withNames(['Ana', 'Marko'])).toBe('With Ana & Marko')
    expect(withNames(['Ana', 'Marko', 'Luka'])).toBe('With Ana, Marko & Luka')
  })
  it('marks the first and round workouts together', () => {
    expect(togetherLine('Ana', 1)).toMatch(/^First workout with Ana/)
    expect(togetherLine('Ana', 5)).toBe('Workout #5 with Ana.')
    expect(togetherLine('Ana', 20)).toMatch(/#20 with Ana.*buddy/)
  })
})
