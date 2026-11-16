import { describe, expect, it } from 'vitest'
import { movementFrames, movementOf, PATTERN_NAMES, patternFrames, type Pattern } from './movement'
import { EQUIPMENT } from './library'

describe('movementOf', () => {
  it('reads the movement of every core exercise', () => {
    const expected: Record<string, Pattern> = {
      'Ab Wheel Rollout': 'plank',
      'Arnold Press': 'ohp',
      'Back Extension': 'hinge',
      'Back Squat': 'squat',
      'Barbell Curl': 'curl',
      'Barbell Row': 'row',
      'Bench Press': 'bench',
      'Bulgarian Split Squat': 'lunge',
      'Cable Crunch': 'crunch',
      'Cable Curl': 'curl',
      'Cable Fly': 'fly',
      'Cable Lateral Raise': 'raise',
      'Chin-Up': 'vpull',
      'Close-Grip Bench Press': 'bench',
      Crunch: 'crunch',
      Deadlift: 'hinge',
      Dips: 'dip',
      'Dumbbell Bench Press': 'bench',
      'Dumbbell Curl': 'curl',
      'Dumbbell Row': 'row',
      'Dumbbell Shoulder Press': 'ohp',
      'Face Pull': 'row',
      'Front Raise': 'raise',
      'Front Squat': 'squat',
      'Goblet Squat': 'squat',
      'Hack Squat': 'squat',
      'Hammer Curl': 'curl',
      'Hanging Leg Raise': 'legraise',
      'Hip Thrust': 'bridge',
      'Incline Bench Press': 'bench',
      'Incline Dumbbell Press': 'bench',
      'Lat Pulldown': 'vpull',
      'Lateral Raise': 'raise',
      'Leg Curl': 'legcurl',
      'Leg Extension': 'legext',
      'Leg Press': 'legpress',
      'Machine Chest Press': 'chestpress',
      'Overhead Press': 'ohp',
      'Overhead Triceps Extension': 'overhead',
      Plank: 'plank',
      'Preacher Curl': 'curl',
      'Pull-Up': 'vpull',
      'Push-Up': 'pushup',
      'Rear Delt Fly': 'raise',
      'Romanian Deadlift': 'hinge',
      'Russian Twist': 'crunch',
      'Seated Cable Row': 'row',
      'Seated Calf Raise': 'calf',
      Shrug: 'shrug',
      'Skull Crusher': 'overhead',
      'Standing Calf Raise': 'calf',
      'Sumo Deadlift': 'hinge',
      'T-Bar Row': 'row',
      'Triceps Pushdown': 'pushdown',
      'Walking Lunge': 'lunge',
      'Wrist Curl': 'curl',
      'Incline Machine Press': 'chestpress',
      'Decline Machine Press': 'chestpress',
      'Pec Deck (Machine Fly)': 'fly',
      'Smith Machine Bench Press': 'bench',
      'Smith Machine Incline Press': 'bench',
      'Seated Machine Row': 'row',
      'Machine High Row': 'row',
      'Assisted Pull-Up Machine': 'vpull',
      'Machine Pullover': 'vpull',
      'Back Extension Machine': 'hinge',
      'Machine Shoulder Press': 'ohp',
      'Machine Lateral Raise': 'raise',
      'Reverse Pec Deck': 'raise',
      'Machine Preacher Curl': 'curl',
      'Machine Triceps Extension': 'overhead',
      'Seated Dip Machine': 'dip',
      'Smith Machine Squat': 'squat',
      'Pendulum Squat': 'squat',
      'Belt Squat': 'squat',
      'Seated Leg Curl': 'legcurl',
      'Hip Abduction Machine': 'abduct',
      'Hip Adduction Machine': 'abduct',
      'Glute Kickback Machine': 'bridge',
      'Hip Thrust Machine': 'bridge',
      'Leg Press Calf Raise': 'calf',
      'Ab Crunch Machine': 'crunch',
      'Rotary Torso Machine': 'crunch',
    }
    expect(Object.keys(expected)).toHaveLength(83)
    for (const [name, pattern] of Object.entries(expected)) expect([name, movementOf(name)]).toEqual([name, pattern])
  })

  it('handles Serbian names and unknown ones', () => {
    expect(movementOf('Čučanj sa šipkom')).toBe('squat')
    expect(movementOf('Zgibovi')).toBe('vpull')
    expect(movementOf('Potisak iznad glave')).toBe('ohp')
    expect(movementOf('Mrtvo dizanje')).toBe('hinge')
    expect(movementOf('Triceps Kickback')).toBe('pushdown')
    expect(movementOf('Burpees')).toBeNull()
    expect(movementFrames('Burpees')).toBeNull()
  })
})

describe('patternFrames', () => {
  it('gives two frames with the same shapes, for every pattern and gear', () => {
    for (const pattern of PATTERN_NAMES) {
      for (const gear of [null, ...EQUIPMENT]) {
        const { frames, box } = patternFrames(pattern, gear)
        const kinds = (i: 0 | 1) => frames[i].map((s) => `${s.kind}:${s.role}:${s.kind === 'line' ? s.points.length : ''}`)
        expect([pattern, gear, kinds(1)]).toEqual([pattern, gear, kinds(0)])
        // Everything lies inside the viewBox.
        const [x, y, size] = box
        for (const shape of frames.flat()) {
          const points = shape.kind === 'line' ? shape.points : [shape.at]
          for (const [px, py] of points) {
            expect(px).toBeGreaterThanOrEqual(x)
            expect(py).toBeGreaterThanOrEqual(y)
            expect(px).toBeLessThanOrEqual(x + size)
            expect(py).toBeLessThanOrEqual(y + size)
          }
        }
      }
    }
  })
})
