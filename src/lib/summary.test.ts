import { describe, expect, it } from 'vitest'
import type { LoggedSet } from './progress'
import { formatPrGain, summarizeWorkout } from './summary'
import type { WorkoutDraft } from './workout'

const set = (weight: string, reps: string, done = true) => ({ weight, reps, done })

const draft: WorkoutDraft = {
  version: 1,
  splitDayId: 'd1',
  dayName: 'Legs',
  date: '2026-11-14',
  startedAt: '2026-11-14T10:00:00.000Z',
  restSeconds: 90,
  restEndsAt: null,
  exercises: [
    { exerciseId: 'squat', name: 'Back Squat', sets: [set('100', '5'), set('105', '3'), set('110', '1', false)] },
    { exerciseId: 'pullup', name: 'Pull-up', sets: [set('', '12')] },
    { exerciseId: 'curl', name: 'Curl', sets: [set('20', '10')] },
    { exerciseId: 'skipped', name: 'Skipped', sets: [set('50', '5', false)] },
  ],
}

const logged = (exerciseId: string, weight_kg: number, reps: number, date = '2026-11-07'): LoggedSet => ({
  workoutId: `w-${date}`,
  date,
  startedAt: `${date}T10:00:00.000Z`,
  exerciseId,
  reps,
  weight_kg,
})

describe('summarizeWorkout', () => {
  it('totals completed sets only', () => {
    const s = summarizeWorkout(draft, '2026-11-14T10:45:30.000Z', [])
    expect(s).toMatchObject({ dayName: 'Legs', durationSeconds: 2730, exercises: 3, sets: 4, reps: 30, volumeKg: 1015, prs: [] })
  })

  it('reports PRs against earlier sessions, by weight or by reps at bodyweight', () => {
    const history = [logged('squat', 100, 5), logged('squat', 102.5, 2, '2026-10-31'), logged('pullup', 0, 10), logged('curl', 20, 12)]
    const { prs } = summarizeWorkout(draft, '2026-11-14T10:45:00.000Z', history)
    expect(prs).toEqual([
      { exerciseId: 'squat', name: 'Back Squat', metric: 'weight', top: { weight: 105, reps: 3 }, previous: { weight: 102.5, reps: 2 } },
      { exerciseId: 'pullup', name: 'Pull-up', metric: 'reps', top: { weight: 0, reps: 12 }, previous: { weight: 0, reps: 10 } },
    ])
    expect(prs.map(formatPrGain)).toEqual(['+2.5 kg', '+2 reps'])
  })

  it('treats a first session as the baseline and reports nothing without history', () => {
    expect(summarizeWorkout(draft, '2026-11-14T10:45:00.000Z', [logged('other', 50, 5)]).prs).toEqual([])
    expect(summarizeWorkout(draft, '2026-11-14T10:45:00.000Z', undefined).prs).toEqual([])
  })
})
