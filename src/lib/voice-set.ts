// Turns a spoken set ("sto kila puta pet", "сто кила пута пет", "100 kg x 5",
// "eighty two and a half kilos times eight") into a weight and reps.

export interface SpokenSet {
  /** kg; 0 = bodyweight; null = not said */
  weight: number | null
  /** null = not said (or not a sensible number) */
  reps: number | null
}

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'dj', е: 'e', ж: 'z', з: 'z', и: 'i', ј: 'j', к: 'k',
  л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'c', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'c', џ: 'dz', ш: 's',
}

const WORD_VALUES: Record<string, number> = {
  // Serbian (no diacritics, ekavian + ijekavian)
  nula: 0, jedan: 1, jedna: 1, jedno: 1, jednu: 1, dva: 2, dve: 2, dvije: 2, tri: 3, cetiri: 4, pet: 5,
  sest: 6, sedam: 7, osam: 8, devet: 9, deset: 10, jedanaest: 11, dvanaest: 12, trinaest: 13,
  cetrnaest: 14, petnaest: 15, sesnaest: 16, sedamnaest: 17, osamnaest: 18, devetnaest: 19,
  dvadeset: 20, trideset: 30, cetrdeset: 40, cetrdest: 40, pedeset: 50, sezdeset: 60, sedamdeset: 70,
  osamdeset: 80, devedeset: 90, sto: 100, stotinu: 100, dvesta: 200, dvjesta: 200, trista: 300,
  cetiristo: 400, petsto: 500,
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
}

// A weight word marks the number as the weight; it is read in the exercise's own unit (kg or lb).
const UNIT = new Set([
  'kg', 'kila', 'kile', 'kilo', 'kilos', 'kilograma', 'kilogram', 'kilograms', 'kilogrami', 'kgs',
  'lb', 'lbs', 'pound', 'pounds', 'funti', 'funta', 'funte',
])
const REPS = new Set([
  'ponavljanja', 'ponavljanje', 'ponavljanj', 'ponavljaja', 'rep', 'reps', 'repetitions', 'repeticija',
  'repova', 'repa',
])
const SEPARATOR = new Set(['x', 'puta', 'put', 'times', 'by', 'for'])
const DECIMAL = new Set(['zarez', 'koma', 'tacka', 'point', 'comma', 'dot'])
const BODYWEIGHT = ['bez tega', 'bez tezine', 'bodyweight', 'body weight', 'sopstven', 'telesn', 'tjelesn']

export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC[ch] ?? ch)
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/×/g, ' x ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)(?=[a-z])/g, '$1 ')
    .replace(/([a-z])(?=\d)/g, '$1 ')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Token = { kind: 'num'; value: number } | { kind: 'word'; text: string }

/** Smallest place a number can still be extended at: 125 -> 1 (closed), 120 -> 10, 100 -> 100. */
const openPlace = (n: number) => (n % 100 === 0 ? 100 : n % 10 === 0 ? 10 : 1)

const isNumberWord = (w: string | undefined) => w !== undefined && (w in WORD_VALUES || w === 'hundred')

/** Groups digits and number words into numbers; other words stay as they are. */
function tokenize(words: string[]): Token[] {
  const out: Token[] = []
  // The number being built from words, and whether it may still grow ("sto" + "dvadeset" + "pet").
  let building: { value: number; open: boolean } | null = null
  const flush = () => {
    if (building) out.push({ kind: 'num', value: building.value })
    building = null
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/\.+$/, '')
    if (w === '') continue

    if (/^\d+(\.\d+)?$/.test(w)) {
      flush()
      out.push({ kind: 'num', value: Number(w) })
      continue
    }

    // Halves: "osamdeset i po", "eighty and a half", "82 i po".
    const half =
      (w === 'i' && (words[i + 1] === 'po' || words[i + 1] === 'pol')) ||
      (w === 'and' && words[i + 1] === 'a' && words[i + 2] === 'half')
    if (half) {
      const last = building ?? (out.at(-1)?.kind === 'num' ? (out.pop() as { value: number }) : null)
      if (last) {
        out.push({ kind: 'num', value: last.value + 0.5 })
        building = null
        i += w === 'i' ? 1 : 2
        continue
      }
    }

    // Decimals: "osamdeset dva zarez pet", "eighty two point five", "82 point 5".
    if (DECIMAL.has(w)) {
      const base = building ?? (out.at(-1)?.kind === 'num' ? (out.pop() as { value: number }) : null)
      let digits = ''
      let j = i + 1
      for (; j < words.length; j++) {
        const next = words[j].replace(/\.+$/, '')
        if (/^\d+$/.test(next)) {
          digits += next
          j++
          break
        }
        if (next in WORD_VALUES && WORD_VALUES[next] < 10) digits += String(WORD_VALUES[next])
        else break
      }
      if (base && digits) {
        out.push({ kind: 'num', value: Number(`${base.value}.${digits}`) })
        building = null
        i = j - 1
        continue
      }
      if (base) out.push({ kind: 'num', value: base.value })
      building = null
      continue
    }

    if (w === 'hundred') {
      if (building) building = { value: building.value * 100, open: true }
      else {
        flush()
        building = { value: 100, open: true }
      }
      continue
    }
    if (w === 'a' && words[i + 1] === 'hundred') continue
    if ((w === 'i' || w === 'and') && building && isNumberWord(words[i + 1])) continue

    if (w in WORD_VALUES) {
      const v = WORD_VALUES[w]
      const current: { value: number; open: boolean } | null = building
      if (current && current.open && v < openPlace(current.value) && current.value > 0) {
        const value: number = current.value + v
        building = { value, open: openPlace(value) > 1 }
      } else {
        flush()
        building = { value: v, open: v === 0 ? false : openPlace(v) > 1 }
      }
      continue
    }

    flush()
    out.push({ kind: 'word', text: w })
  }
  flush()
  return out
}

const validWeight = (n: number | null) => n !== null && n >= 0 && n <= 999
const validReps = (n: number | null) => n !== null && Number.isInteger(n) && n >= 1 && n <= 100

/** Reads weight and reps from what the speech recognizer heard. */
export function parseSpokenSet(transcript: string): SpokenSet {
  const text = normalizeSpeech(transcript)
  const tokens = tokenize(text.split(' '))
  const bodyweight = BODYWEIGHT.some((phrase) => text.includes(phrase))

  const numbers: { value: number; role: 'weight' | 'reps' | null; explicit: boolean }[] = []
  tokens.forEach((t, i) => {
    if (t.kind !== 'num') return
    const next = tokens[i + 1]
    const prev = tokens[i - 1]
    const nextWord = next?.kind === 'word' ? next.text : null
    const prevWord = prev?.kind === 'word' ? prev.text : null
    const numberAfter = tokens.slice(i + 1).some((x) => x.kind === 'num')
    // Labelled ("100 kg", "5 reps") beats position ("100 x 5", "x 5").
    const explicit = !!nextWord && (UNIT.has(nextWord) || REPS.has(nextWord))
    let role: 'weight' | 'reps' | null = null
    if (nextWord && UNIT.has(nextWord)) role = 'weight'
    else if (nextWord && REPS.has(nextWord)) role = 'reps'
    else if (nextWord && SEPARATOR.has(nextWord)) role = numberAfter ? 'weight' : 'reps'
    else if (prevWord && SEPARATOR.has(prevWord)) role = 'reps'
    else if (prevWord && UNIT.has(prevWord) && numbers.some((n) => n.role === 'weight')) role = 'reps'
    numbers.push({ value: t.value, role, explicit })
  })

  let weight = numbers.find((n) => n.role === 'weight')?.value ?? null
  let reps = numbers.find((n) => n.role === 'reps')?.value ?? null
  const free = numbers.filter((n) => n.role === null).map((n) => n.value)

  if (weight === null && reps === null) {
    if (free.length >= 2) [weight, reps] = [free[0], free[1]]
    else if (free.length === 1) {
      if (bodyweight) reps = free[0]
      else weight = free[0]
    }
  } else if (weight === null && free.length > 0 && !bodyweight) weight = free[0]
  else if (reps === null && free.length > 0) reps = free[0]

  // "5 x 100" said the other way round. Only when neither number was labelled with
  // kg / reps, and the reading as said is implausible (100 reps of 5 kg).
  const labelled = numbers.some((n) => n.explicit)
  const implausible = reps !== null && weight !== null && (!validReps(reps) || (reps > 30 && weight <= 30))
  if (!labelled && implausible && validReps(weight) && validWeight(reps)) {
    ;[weight, reps] = [reps, weight]
  }
  if (bodyweight && weight === null) weight = 0

  return {
    weight: validWeight(weight) ? Math.round(weight! * 100) / 100 : null,
    reps: validReps(reps) ? reps : null,
  }
}
