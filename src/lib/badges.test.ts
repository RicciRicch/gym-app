import { describe, expect, it } from 'vitest'
import { BADGES, badgeProgressLabel, computeBadges, isLegDay, unseenBadges, type BadgeWorkout } from './badges'
import type { LoggedSet } from './progress'

/** ISO timestamp of a local time, so the tests pass in any time zone. */
const at = (date: string, hour: number, minute = 0) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

let seq = 0
function workout(date: string, opts: { hour?: number; minutes?: number; dayName?: string } = {}): BadgeWorkout {
  const { hour = 18, minutes = 60, dayName = 'Push' } = opts
  const startedAt = at(date, hour)
  return {
    id: `w${++seq}`,
    date,
    dayName,
    startedAt,
    finishedAt: new Date(Date.parse(startedAt) + minutes * 60_000).toISOString(),
  }
}

function set(w: BadgeWorkout, weight: number, reps: number, exerciseId = 'squat'): LoggedSet {
  return { workoutId: w.id, date: w.date, startedAt: w.startedAt, exerciseId, reps, weight_kg: weight }
}

const byId = (states: ReturnType<typeof computeBadges>) => new Map(states.map((s) => [s.badge.id, s]))

describe('computeBadges', () => {
  it('returns every badge locked with no workouts', () => {
    const states = computeBadges({ workouts: [], sets: [], streakTarget: 3 })
    expect(states).toHaveLength(BADGES.length)
    expect(states.every((s) => s.earnedOn === null && s.progress === 0)).toBe(true)
  })

  it('earns workout-count badges on the day the count is reached', () => {
    const dates = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    const states = byId(computeBadges({ workouts: dates.map((d) => workout(d)).reverse(), sets: [], streakTarget: 3 }))
    expect(states.get('workouts-1')!.earnedOn).toBe('2026-10-01')
    expect(states.get('workouts-10')!.earnedOn).toBe('2026-10-10')
    expect(states.get('workouts-50')).toMatchObject({ earnedOn: null, progress: 12 })
  })

  it('adds up volume and caps progress at the goal', () => {
    const a = workout('2026-10-01')
    const b = workout('2026-10-03')
    const sets = [set(a, 100, 50), set(b, 100, 60)] // 5 t, then 11 t
    const states = byId(computeBadges({ workouts: [a, b], sets, streakTarget: 3 }))
    expect(states.get('volume-10t')).toMatchObject({ earnedOn: '2026-10-03', progress: 10_000 })
    expect(states.get('volume-100t')).toMatchObject({ earnedOn: null, progress: 11_000 })
  })

  it('counts personal records, not the first session', () => {
    const ws = ['2026-10-01', '2026-10-03', '2026-10-05'].map((d) => workout(d))
    const sets = [set(ws[0], 60, 5), set(ws[1], 65, 5), set(ws[1], 20, 10, 'curl'), set(ws[2], 60, 5)]
    const states = byId(computeBadges({ workouts: ws, sets, streakTarget: 3 }))
    expect(states.get('prs-1')).toMatchObject({ earnedOn: '2026-10-03', progress: 1 })
  })

  it('finds early, late, long and weekend workouts', () => {
    const ws = [
      workout('2026-10-05', { hour: 6 }), // Monday 6:00
      workout('2026-10-06', { hour: 22 }),
      workout('2026-10-07', { minutes: 95 }),
      workout('2026-10-10'), // Saturday
      workout('2026-10-11'), // Sunday
    ]
    const states = byId(computeBadges({ workouts: ws, sets: [], streakTarget: 1 }))
    expect(states.get('early-bird')!.earnedOn).toBe('2026-10-05')
    expect(states.get('night-owl')!.earnedOn).toBe('2026-10-06')
    expect(states.get('marathon')!.earnedOn).toBe('2026-10-07')
    expect(states.get('weekend')!.earnedOn).toBe('2026-10-11')
  })

  it('does not count a Sunday and the Saturday after it as a weekend', () => {
    const ws = [workout('2026-10-04'), workout('2026-10-10')] // Sunday, then Saturday
    expect(byId(computeBadges({ workouts: ws, sets: [], streakTarget: 1 })).get('weekend')!.earnedOn).toBeNull()
  })

  it('a 7:00 start is not early, a 3:00 start is late', () => {
    const states = byId(
      computeBadges({ workouts: [workout('2026-10-05', { hour: 7 }), workout('2026-10-06', { hour: 3 })], sets: [], streakTarget: 1 }),
    )
    expect(states.get('early-bird')!.earnedOn).toBeNull()
    expect(states.get('night-owl')!.earnedOn).toBe('2026-10-06')
  })

  it('counts leg days by name', () => {
    const ws = Array.from({ length: 10 }, (_, i) =>
      workout(`2026-09-${String(i + 1).padStart(2, '0')}`, { dayName: i % 2 ? 'Lower B' : 'Noge' }),
    )
    ws.push(workout('2026-09-20', { dayName: 'Push' }))
    const states = byId(computeBadges({ workouts: ws, sets: [], streakTarget: 3 }))
    expect(states.get('legs-10')).toMatchObject({ earnedOn: '2026-09-10', progress: 10 })
  })

  it('earns streak badges on the day the 4th week is met, bridging frozen weeks', () => {
    // Weeks starting Mon 2026-09-07, 14, (21 frozen, nothing), 28, 10-05; two days each.
    const ws = ['2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16', '2026-09-28', '2026-09-30', '2026-10-05', '2026-10-08'].map(
      (d) => workout(d),
    )
    const frozen = byId(computeBadges({ workouts: ws, sets: [], streakTarget: 2, frozenWeeks: ['2026-09-21'] }))
    expect(frozen.get('streak-4')).toMatchObject({ earnedOn: '2026-10-08', progress: 4 })

    const broken = byId(computeBadges({ workouts: ws, sets: [], streakTarget: 2 }))
    expect(broken.get('streak-4')).toMatchObject({ earnedOn: null, progress: 2 })
  })

  it('a short week breaks the run', () => {
    const ws = ['2026-09-07', '2026-09-09', '2026-09-14', '2026-09-21', '2026-09-23'].map((d) => workout(d))
    const states = byId(computeBadges({ workouts: ws, sets: [], streakTarget: 2 }))
    expect(states.get('streak-4')!.progress).toBe(1)
  })
})

describe('isLegDay', () => {
  it('matches leg day names', () => {
    for (const name of ['Legs', 'Leg day', 'Lower A', 'Noge', 'Dan za noge', 'Quads & Glutes']) expect(isLegDay(name)).toBe(true)
    for (const name of ['Push', 'Upper', 'Pull', 'Full body']) expect(isLegDay(name)).toBe(false)
  })
})

describe('badgeProgressLabel', () => {
  it('formats counts, tonnes and one-off feats', () => {
    const states = byId(computeBadges({ workouts: [], sets: [], streakTarget: 3 }))
    expect(badgeProgressLabel({ ...states.get('workouts-10')!, progress: 7 })).toBe('7 / 10')
    expect(badgeProgressLabel({ ...states.get('volume-100t')!, progress: 42_400 })).toBe('42 / 100 t')
    expect(badgeProgressLabel({ ...states.get('volume-10t')!, progress: 2_450 })).toBe('2.5 / 10 t')
    expect(badgeProgressLabel(states.get('early-bird')!)).toBe('')
  })
})

describe('unseenBadges', () => {
  it('lists earned badges not seen yet', () => {
    const states = computeBadges({ workouts: [workout('2026-10-05', { hour: 6 })], sets: [], streakTarget: 1 })
    expect(unseenBadges(states, new Set(['workouts-1']))).toEqual(['early-bird'])
  })
})
