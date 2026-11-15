import { describe, expect, it } from 'vitest'
import { equipmentOf, yourExerciseIds } from './library'

describe('equipmentOf', () => {
  it('reads the gear of every core exercise', () => {
    const expected: Record<string, ReturnType<typeof equipmentOf>> = {
      'Ab Wheel Rollout': 'bodyweight',
      'Arnold Press': 'dumbbell',
      'Back Extension': 'bodyweight',
      'Back Squat': 'barbell',
      'Barbell Curl': 'barbell',
      'Barbell Row': 'barbell',
      'Bench Press': 'barbell',
      'Bulgarian Split Squat': 'dumbbell',
      'Cable Crunch': 'cable',
      'Cable Curl': 'cable',
      'Cable Fly': 'cable',
      'Cable Lateral Raise': 'cable',
      'Chin-Up': 'bodyweight',
      'Close-Grip Bench Press': 'barbell',
      Crunch: 'bodyweight',
      Deadlift: 'barbell',
      Dips: 'bodyweight',
      'Dumbbell Bench Press': 'dumbbell',
      'Dumbbell Curl': 'dumbbell',
      'Dumbbell Row': 'dumbbell',
      'Dumbbell Shoulder Press': 'dumbbell',
      'Face Pull': 'cable',
      'Front Raise': 'dumbbell',
      'Front Squat': 'barbell',
      'Goblet Squat': 'dumbbell',
      'Hack Squat': 'machine',
      'Hammer Curl': 'dumbbell',
      'Hanging Leg Raise': 'bodyweight',
      'Hip Thrust': 'barbell',
      'Incline Bench Press': 'barbell',
      'Incline Dumbbell Press': 'dumbbell',
      'Lat Pulldown': 'cable',
      'Lateral Raise': 'dumbbell',
      'Leg Curl': 'machine',
      'Leg Extension': 'machine',
      'Leg Press': 'machine',
      'Machine Chest Press': 'machine',
      'Overhead Press': 'barbell',
      'Overhead Triceps Extension': 'dumbbell',
      Plank: 'bodyweight',
      'Preacher Curl': 'barbell',
      'Pull-Up': 'bodyweight',
      'Push-Up': 'bodyweight',
      'Rear Delt Fly': 'dumbbell',
      'Romanian Deadlift': 'barbell',
      'Russian Twist': 'bodyweight',
      'Seated Cable Row': 'cable',
      'Seated Calf Raise': 'machine',
      Shrug: 'barbell',
      'Skull Crusher': 'barbell',
      'Standing Calf Raise': 'machine',
      'Sumo Deadlift': 'barbell',
      'T-Bar Row': 'barbell',
      'Triceps Pushdown': 'cable',
      'Walking Lunge': 'dumbbell',
      'Wrist Curl': 'dumbbell',
    }
    for (const [name, equipment] of Object.entries(expected)) expect([name, equipmentOf(name)]).toEqual([name, equipment])
  })

  it('handles Serbian names and unknown ones', () => {
    expect(equipmentOf('Čučanj sa šipkom')).toBe('barbell')
    expect(equipmentOf('Potisak bučicama')).toBe('dumbbell')
    expect(equipmentOf('Zgibovi')).toBe('bodyweight')
    expect(equipmentOf('Burpees')).toBeNull()
  })
})

describe('yourExerciseIds', () => {
  it('puts the latest logged first, then the split, without duplicates', () => {
    const sets = [
      { exerciseId: 'squat', date: '2026-11-10' },
      { exerciseId: 'bench', date: '2026-11-12' },
      { exerciseId: 'squat', date: '2026-11-03' },
    ]
    expect(yourExerciseIds(sets, ['row', 'bench', 'curl', 'dips'], 6)).toEqual(['bench', 'squat', 'row', 'curl', 'dips'])
    expect(yourExerciseIds(sets, ['row', 'curl', 'dips'])).toHaveLength(4)
    expect(yourExerciseIds(sets, ['row', 'curl'], 3)).toEqual(['bench', 'squat', 'row'])
    expect(yourExerciseIds([], [])).toEqual([])
  })
})
