import { describe, expect, it } from 'vitest'
import { normalizeSpeech, parseSpokenSet } from './voice-set'

const set = (weight: number | null, reps: number | null) => ({ weight, reps })

describe('normalizeSpeech', () => {
  it('transliterates Cyrillic and drops diacritics', () => {
    expect(normalizeSpeech('Сто кила пута пет')).toBe('sto kila puta pet')
    expect(normalizeSpeech('četrdeset šest')).toBe('cetrdeset sest')
  })

  it('splits glued numbers and units, keeps decimal commas', () => {
    expect(normalizeSpeech('100kg x5')).toBe('100 kg x 5')
    expect(normalizeSpeech('82,5 kg × 8')).toBe('82.5 kg x 8')
  })
})

describe('parseSpokenSet — Serbian', () => {
  it.each([
    ['sto kila puta pet', set(100, 5)],
    ['Сто кила пута пет', set(100, 5)],
    ['sto dvadeset kila puta osam', set(120, 8)],
    ['osamdeset pet puta deset', set(85, 10)],
    ['dvadeset i pet kila dvanaest ponavljanja', set(25, 12)],
    ['osamdeset dva i po kila puta šest', set(82.5, 6)],
    ['osamdeset dva zarez pet puta šest', set(82.5, 6)],
    ['šezdeset kila osam ponavljanja', set(60, 8)],
    ['sto kila pet puta', set(100, 5)],
    ['pet puta pet', set(5, 5)],
    ['dvesta kila puta tri', set(200, 3)],
    ['dvanaest ponavljanja', set(null, 12)],
    ['bez tega dvanaest ponavljanja', set(0, 12)],
    ['bez tega petnaest', set(0, 15)],
  ])('%s', (spoken, expected) => {
    expect(parseSpokenSet(spoken)).toEqual(expected)
  })
})

describe('parseSpokenSet — digits from the recognizer', () => {
  it.each([
    ['100 kila puta 5', set(100, 5)],
    ['100 kg x 5', set(100, 5)],
    ['100x5', set(100, 5)],
    ['82,5 kg 8', set(82.5, 8)],
    ['82 i po kila puta 6', set(82.5, 6)],
    ['100 5', set(100, 5)],
    ['5 x 100', set(100, 5)],
    ['60 kg 8 ponavljanja', set(60, 8)],
  ])('%s', (spoken, expected) => {
    expect(parseSpokenSet(spoken)).toEqual(expected)
  })
})

describe('parseSpokenSet — English', () => {
  it.each([
    ['a hundred kilos times five', set(100, 5)],
    ['one hundred twenty kilos for eight', set(120, 8)],
    ['eighty two and a half kilos times six', set(82.5, 6)],
    ['eighty two point five by six', set(82.5, 6)],
    ['twelve reps at sixty kilos', set(60, 12)],
    ['bodyweight fifteen reps', set(0, 15)],
    ['225 lbs for 8', set(225, 8)],
    ['dvesta funti puta deset', set(200, 10)],
    ['eight reps at 135 pounds', set(135, 8)],
  ])('%s', (spoken, expected) => {
    expect(parseSpokenSet(spoken)).toEqual(expected)
  })
})

describe('parseSpokenSet — not enough to log', () => {
  it('a lone number is a weight without reps', () => {
    expect(parseSpokenSet('sto kila')).toEqual(set(100, null))
  })

  it('nothing numeric', () => {
    expect(parseSpokenSet('hello there')).toEqual(set(null, null))
  })

  it('rejects silly reps', () => {
    expect(parseSpokenSet('100 kg x 500')).toEqual(set(100, null))
  })
})
