import { describe, expect, it } from 'vitest'
import {
  coverCrop,
  durationLabel,
  groupReactions,
  isExpired,
  latestPerAuthor,
  photoSize,
  postAgo,
  prLine,
  proofLine,
  reactedLine,
  shouldMirror,
  unseenCount,
  workoutPhotoPath,
} from './feed'

describe('post photos', () => {
  it('crops the centre to portrait 4:5', () => {
    // Landscape webcam frame: full height, centred width.
    expect(coverCrop(1280, 720)).toEqual({ sx: 352, sy: 0, sw: 576, sh: 720 })
    // Tall phone photo: full width, centred height.
    expect(coverCrop(1080, 1920)).toEqual({ sx: 0, sy: 285, sw: 1080, sh: 1350 })
    // Already 4:5.
    expect(coverCrop(800, 1000)).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1000 })
  })

  it('never upscales and caps the width', () => {
    expect(photoSize(576)).toEqual({ width: 576, height: 720 })
    expect(photoSize(3024)).toEqual({ width: 1080, height: 1350 })
  })

  it('stores photos in the owner folder', () => {
    expect(workoutPhotoPath('u1', 'image/webp', 'abc')).toBe('u1/abc.webp')
    expect(workoutPhotoPath('u1', 'image/jpeg', 'abc')).toBe('u1/abc.jpg')
  })
})

describe('post card text', () => {
  const now = new Date(2026, 10, 17, 20, 0)
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString()

  it('says how long ago', () => {
    expect(postAgo(at(17, 19, 59), now)).toBe('1 min ago')
    expect(postAgo(new Date(now.getTime() - 20_000).toISOString(), now)).toBe('just now')
    expect(postAgo(at(17, 17), now)).toBe('3 h ago')
    expect(postAgo(at(16, 23), now)).toBe('yesterday')
    expect(postAgo(at(14, 9), now)).toBe('3 days ago')
    expect(postAgo(at(2, 9), now)).toBe('2 Nov')
  })

  it('names the PRs without weights', () => {
    expect(prLine([])).toBe('')
    expect(prLine(['Bench Press'])).toBe('New PR: Bench Press')
    expect(prLine(['Bench Press', 'Back Squat'])).toBe('New PRs: Bench Press, Back Squat')
    expect(prLine(['A', 'B', 'C', 'D'])).toBe('New PRs: A, B +2')
  })

  it('formats the workout length', () => {
    expect(durationLabel(20)).toBe('1 min')
    expect(durationLabel(45 * 60)).toBe('45 min')
    expect(durationLabel(65 * 60 + 10)).toBe('1 h 05 min')
  })

  it('expires posts after 30 days', () => {
    expect(isExpired(at(1, 9), now)).toBe(false)
    expect(isExpired(new Date(2026, 9, 17, 19).toISOString(), now)).toBe(true)
  })

  it('has a line for the photo step', () => {
    expect(proofLine('2026-11-17', true)).toMatch(/PR|Record|record/)
    expect(proofLine('2026-11-17', false).length).toBeGreaterThan(0)
  })
})

describe('reactions', () => {
  it('counts per kind, finds mine and ignores unknown kinds', () => {
    const map = groupReactions(
      [
        { postId: 'p1', userId: 'ana', kind: 'fire' },
        { postId: 'p1', userId: 'me', kind: 'bump' },
        { postId: 'p1', userId: 'marko', kind: 'fire' },
        { postId: 'p1', userId: 'x', kind: 'heart' },
        { postId: 'p2', userId: 'ana', kind: 'crown' },
      ],
      'me',
    )
    expect(map.get('p1')).toEqual({ counts: { fire: 2, bump: 1, crown: 0 }, mine: 'bump', userIds: ['ana', 'me', 'marko'] })
    expect(map.get('p2')?.mine).toBeNull()
    expect(map.has('p3')).toBe(false)
  })

  it('lists who reacted', () => {
    expect(reactedLine([])).toBe('')
    expect(reactedLine(['Ana'])).toBe('Ana reacted')
    expect(reactedLine(['Ana', 'Marko'])).toBe('Ana and Marko reacted')
    expect(reactedLine(['Ana', 'Marko', 'Luka'])).toBe('Ana, Marko and 1 other reacted')
    expect(reactedLine(['Ana', 'Marko', 'Luka', 'Iva'])).toBe('Ana, Marko and 2 others reacted')
  })
})

describe('unseen posts', () => {
  const posts = [
    { userId: 'ana', createdAt: '2026-11-17T10:00:00Z' },
    { userId: 'me', createdAt: '2026-11-17T11:00:00Z' },
    { userId: 'marko', createdAt: '2026-11-16T10:00:00Z' },
  ]
  it('counts friends’ posts newer than the last visit', () => {
    expect(unseenCount(posts, 'me', '2026-11-16T12:00:00Z')).toBe(1)
    expect(unseenCount(posts, 'me', '2026-11-15T00:00:00Z')).toBe(2)
  })
  it('shows nothing before the feed was ever opened', () => {
    expect(unseenCount(posts, 'me', null)).toBe(0)
  })
})

describe('latest per author', () => {
  it('keeps each author’s newest post in feed order', () => {
    const posts = [
      { id: 1, userId: 'ana' },
      { id: 2, userId: 'me' },
      { id: 3, userId: 'ana' },
      { id: 4, userId: 'marko' },
    ]
    expect(latestPerAuthor(posts).map((p) => p.id)).toEqual([1, 2, 4])
  })
})

describe('camera mirroring', () => {
  it('mirrors selfies, never the back camera', () => {
    expect(shouldMirror('user', 'environment')).toBe(true)
    expect(shouldMirror('environment', 'user')).toBe(false)
    // Laptop webcams report no facing mode.
    expect(shouldMirror(undefined, 'user')).toBe(true)
    expect(shouldMirror(undefined, 'environment')).toBe(false)
  })
})
