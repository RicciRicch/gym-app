// Movement figures: every exercise maps by name to one of ~25 movement patterns,
// each drawn as a line figure in two poses (start, end). The figure component
// animates between them; lists show one pose as a still glyph. No image assets.

import { equipmentOf, type Equipment } from './library'
import { searchKey } from './muscles'

export type Pattern =
  | 'squat'
  | 'lunge'
  | 'hinge'
  | 'shrug'
  | 'bridge'
  | 'legpress'
  | 'legext'
  | 'legcurl'
  | 'calf'
  | 'abduct'
  | 'bench'
  | 'chestpress'
  | 'pushup'
  | 'dip'
  | 'ohp'
  | 'raise'
  | 'fly'
  | 'row'
  | 'vpull'
  | 'curl'
  | 'pushdown'
  | 'overhead'
  | 'crunch'
  | 'legraise'
  | 'plank'

// Checked in order against searchKey(name): specific words before general ones
// ("leg press calf raise" is a calf raise, "rear delt fly" a raise, "leg curl" no curl).
const RULES: [Pattern, string[]][] = [
  ['calf', ['calf', 'listov']],
  ['abduct', ['abduct', 'adduct', 'abdukc', 'addukc', 'odmicanj', 'primicanj']],
  ['legcurl', ['leg curl', 'pregib nog', 'pregibanje nog']],
  ['legext', ['leg extension', 'opruzanje nog', 'ekstenzija nog']],
  ['legpress', ['leg press', 'nozna presa', 'presa za noge']],
  ['bridge', ['hip thrust', 'glute bridge', 'glute kickback', 'gluteus most']],
  ['legraise', ['leg raise', 'knee raise', 'podizanje nogu', 'podizanje kolena']],
  ['crunch', ['crunch', 'sit-up', 'sit up', 'twist', 'rotary', 'trbusnjac']],
  ['plank', ['plank', 'ab wheel', 'rollout']],
  ['vpull', ['pull-up', 'pull up', 'pullup', 'chin-up', 'chin up', 'pulldown', 'pullover', 'zgib']],
  ['row', ['row', 'face pull', 'veslanj', 'veslo']],
  ['shrug', ['shrug', 'sleganj']],
  ['hinge', ['deadlift', 'good morning', 'back extension', 'hiperekstenzij', 'mrtvo dizanje', 'rdl']],
  ['lunge', ['lunge', 'split squat', 'bulgar', 'iskora', 'step-up', 'step up']],
  ['squat', ['squat', 'cucanj', 'cucnj']],
  ['pushup', ['push-up', 'push up', 'pushup', 'sklek']],
  ['overhead', ['triceps extension', 'overhead triceps', 'skull', 'francusk']],
  ['pushdown', ['pushdown', 'triceps', 'tricep', 'kickback']],
  ['curl', ['curl', 'pregib', 'biceps', 'bicep']],
  ['raise', ['rear delt', 'reverse pec', 'lateral raise', 'front raise', 'raise', 'odrucenj', 'predrucenj']],
  ['fly', ['fly', 'flye', 'pec deck', 'crossover', 'krosover', 'razvlacenj']],
  ['ohp', ['overhead press', 'shoulder press', 'arnold', 'military', 'iznad glave', 'vojnick', 'ohp']],
  ['dip', ['dip', 'propadanj']],
  ['chestpress', ['chest press', 'incline machine press', 'decline machine press']],
  ['bench', ['bench', 'benc', 'potisak', 'press']],
]

/** The movement pattern of an exercise, guessed from its name; null when the name gives no clue. */
export function movementOf(name: string): Pattern | null {
  const key = searchKey(name)
  for (const [pattern, words] of RULES) if (words.some((w) => key.includes(w))) return pattern
  return null
}

// ---- geometry ------------------------------------------------------------

export type Pt = readonly [number, number]

/** What the figure is drawn from. The two frames of a pattern list the same shapes in the same order. */
export type Shape =
  | { kind: 'line'; role: 'body' | 'scene' | 'cable' | 'bar'; points: Pt[] }
  | { kind: 'dot'; role: 'head' | 'plate' | 'weight' | 'handle' | 'pad'; at: Pt; r: number }

const SHIN = 40
const THIGH = 42
const TORSO = 45
const UPPER_ARM = 28
const FOREARM = 26
const FOOT = 15
const NECK = 20
const GROUND = 182

const rad = (deg: number) => (deg * Math.PI) / 180
/** A point `len` away from `from` in direction `deg` (0 = right, 90 = down: SVG coordinates). */
const step = (from: Pt, deg: number, len: number): Pt => [from[0] + len * Math.cos(rad(deg)), from[1] + len * Math.sin(rad(deg))]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/** Side view, facing right. Angles are absolute segment directions (degrees). */
interface SidePose {
  anchor: 'ankle' | 'toe' | 'hip' | 'hand' | 'shoulder' | 'elbow'
  at: Pt
  torso: number // hip -> shoulder
  thigh: number // hip -> knee
  shin: number // knee -> ankle
  foot?: number // ankle -> toe
  upperArm: number // shoulder -> elbow
  forearm: number // elbow -> hand
  neck?: number // shoulder -> head, defaults to the torso direction
  /** The other leg, when it is not hidden behind the first (lunges). */
  leg2?: { thigh: number; shin: number; foot?: number }
  /** Shoulders raised by this much (shrugs). */
  lift?: number
}

/** Front view: offsets of the right elbow / hand from the right shoulder, knee / ankle from the right hip. */
interface FrontPose {
  shoulderY: number
  hipY: number
  elbow: Pt
  hand: Pt
  knee: Pt
  ankle: Pt
}

interface Joints {
  hands: Pt[]
  hip: Pt
  ankle: Pt
  shin: number
  body: Shape[]
}

function sideJoints(p: SidePose): Joints {
  const hip: Pt = [0, 0]
  const knee = step(hip, p.thigh, THIGH)
  const ankle = step(knee, p.shin, SHIN)
  const toe = step(ankle, p.foot ?? 0, FOOT)
  const torsoTop = step(hip, p.torso, TORSO)
  const shoulder: Pt = [torsoTop[0], torsoTop[1] - (p.lift ?? 0)]
  const elbow = step(shoulder, p.upperArm, UPPER_ARM)
  const hand = step(elbow, p.forearm, FOREARM)
  const named = { ankle, toe, hip, hand, shoulder, elbow }
  const anchor = named[p.anchor]
  const o: Pt = [p.at[0] - anchor[0], p.at[1] - anchor[1]]
  const t = (q: Pt) => add(q, o)

  const body: Shape[] = [
    { kind: 'line', role: 'body', points: [t(toe), t(ankle), t(knee), t(hip), t(torsoTop), t(shoulder)] },
  ]
  if (p.leg2) {
    const knee2 = step(hip, p.leg2.thigh, THIGH)
    const ankle2 = step(knee2, p.leg2.shin, SHIN)
    body.push({ kind: 'line', role: 'body', points: [t(hip), t(knee2), t(ankle2), t(step(ankle2, p.leg2.foot ?? 0, FOOT))] })
  }
  body.push({ kind: 'line', role: 'body', points: [t(shoulder), t(elbow), t(hand)] })
  body.push({ kind: 'dot', role: 'head', at: t(step(shoulder, p.neck ?? p.torso, NECK)), r: 10 })
  return { hands: [t(hand)], hip: t(hip), ankle: t(ankle), shin: p.shin, body }
}

const CX = 100
const mirror = (q: Pt): Pt => [-q[0], q[1]]

function frontJoints(p: FrontPose): Joints {
  const shR: Pt = [CX + 14, p.shoulderY]
  const shL: Pt = [CX - 14, p.shoulderY]
  const hipR: Pt = [CX + 9, p.hipY]
  const hipL: Pt = [CX - 9, p.hipY]
  const handR = add(shR, p.hand)
  const handL = add(shL, mirror(p.hand))
  const body: Shape[] = [
    { kind: 'line', role: 'body', points: [handL, add(shL, mirror(p.elbow)), shL, shR, add(shR, p.elbow), handR] },
    { kind: 'line', role: 'body', points: [[CX, p.shoulderY], [CX, p.hipY]] },
    { kind: 'line', role: 'body', points: [add(hipL, mirror(p.ankle)), add(hipL, mirror(p.knee)), hipL, hipR, add(hipR, p.knee), add(hipR, p.ankle)] },
    { kind: 'dot', role: 'head', at: [CX, p.shoulderY - NECK], r: 10 },
  ]
  return { hands: [handL, handR], hip: [CX, p.hipY], ankle: add(hipR, p.ankle), shin: 90, body }
}

// ---- patterns ------------------------------------------------------------

interface PatternDef {
  frames: readonly [SidePose, SidePose] | readonly [FrontPose, FrontPose]
  view: 'side' | 'front'
  /** The frame shown as a still glyph: the one that reads best. */
  glyph: 0 | 1
  /** Gear when the name gives no clue. */
  gear: Equipment
  /** Where a cable comes from (for the right hand; mirrored in front view). */
  cable?: Pt
  /** The weight sits on the hips (hip thrust), not in the hands. */
  weightAtHip?: boolean
  /** Static props: bench, bar, seat. */
  scene?: Pt[][]
  /** No floor line (hanging, or the scene has its own). */
  noGround?: boolean
  /** A moving part: the leg press sled, or the roller pad of a leg extension / curl. */
  attach?: 'sled' | 'pad-front' | 'pad-back'
}

const stand = { thigh: 90, shin: 90, torso: -90 }
const SEAT: Pt[][] = [
  [[66, 140], [128, 140]],
  [[74, 140], [68, 84]],
  [[100, 140], [100, GROUND]],
]

const PATTERNS: Record<Pattern, PatternDef> = {
  squat: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    frames: [
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 150, forearm: -60 },
      { anchor: 'ankle', at: [95, GROUND], thigh: 15, shin: 105, torso: -60, upperArm: 180, forearm: -30, neck: -75 },
    ],
  },
  lunge: {
    view: 'side',
    glyph: 1,
    gear: 'dumbbell',
    frames: [
      { anchor: 'ankle', at: [128, GROUND], thigh: 75, shin: 85, torso: -90, upperArm: 90, forearm: 90, leg2: { thigh: 115, shin: 115, foot: 30 } },
      { anchor: 'ankle', at: [128, GROUND], thigh: 10, shin: 95, torso: -90, upperArm: 90, forearm: 90, leg2: { thigh: 100, shin: 170, foot: 10 } },
    ],
  },
  hinge: {
    view: 'side',
    glyph: 0,
    gear: 'barbell',
    frames: [
      { anchor: 'ankle', at: [92, GROUND], thigh: 40, shin: 100, torso: -25, upperArm: 90, forearm: 90, neck: -35 },
      { anchor: 'ankle', at: [92, GROUND], ...stand, upperArm: 90, forearm: 90 },
    ],
  },
  shrug: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    frames: [
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 90, forearm: 90 },
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 90, forearm: 90, lift: 8 },
    ],
  },
  bridge: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    weightAtHip: true,
    scene: [
      [[16, 141], [60, 141]],
      [[36, 141], [36, GROUND]],
    ],
    frames: [
      { anchor: 'shoulder', at: [55, 133], torso: -140, thigh: -30, shin: 85, upperArm: 60, forearm: 10, neck: 200 },
      { anchor: 'shoulder', at: [55, 133], torso: 171, thigh: 22, shin: 95, upperArm: 30, forearm: -40, neck: 200 },
    ],
  },
  legpress: {
    view: 'side',
    glyph: 1,
    gear: 'machine',
    attach: 'sled',
    scene: [[[96, 152], [44, 122]]],
    frames: [
      { anchor: 'hip', at: [92, 142], torso: -150, thigh: -85, shin: 15, foot: -130, upperArm: 95, forearm: 10 },
      { anchor: 'hip', at: [92, 142], torso: -150, thigh: -40, shin: -40, foot: -130, upperArm: 95, forearm: 10 },
    ],
  },
  legext: {
    view: 'side',
    glyph: 1,
    gear: 'machine',
    attach: 'pad-front',
    scene: SEAT,
    frames: [
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: 90, foot: 0, upperArm: 95, forearm: 20 },
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: -8, foot: -90, upperArm: 95, forearm: 20 },
    ],
  },
  legcurl: {
    view: 'side',
    glyph: 1,
    gear: 'machine',
    attach: 'pad-back',
    scene: SEAT,
    frames: [
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: -8, foot: -90, upperArm: 95, forearm: 20 },
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: 115, foot: 25, upperArm: 95, forearm: 20 },
    ],
  },
  calf: {
    view: 'side',
    glyph: 1,
    gear: 'machine',
    scene: [[[100, 186], [136, 186]]],
    noGround: true,
    frames: [
      { anchor: 'toe', at: [112, 180], ...stand, foot: 0, upperArm: 90, forearm: 90 },
      { anchor: 'toe', at: [112, 180], ...stand, foot: 40, upperArm: 90, forearm: 90 },
    ],
  },
  abduct: {
    view: 'front',
    glyph: 1,
    gear: 'machine',
    scene: [[[72, 126], [128, 126]]],
    frames: [
      { shoulderY: 74, hipY: 120, elbow: [6, 22], hand: [8, 44], knee: [4, 22], ankle: [6, 60] },
      { shoulderY: 74, hipY: 120, elbow: [6, 22], hand: [8, 44], knee: [30, 16], ankle: [26, 56] },
    ],
  },
  bench: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    scene: [
      [[42, 151], [124, 151]],
      [[54, 151], [54, GROUND]],
      [[112, 151], [112, GROUND]],
    ],
    frames: [
      { anchor: 'hip', at: [115, 142], torso: 180, thigh: 0, shin: 90, upperArm: 30, forearm: -100 },
      { anchor: 'hip', at: [115, 142], torso: 180, thigh: 0, shin: 90, upperArm: -90, forearm: -90 },
    ],
  },
  chestpress: {
    view: 'side',
    glyph: 1,
    gear: 'machine',
    scene: SEAT,
    frames: [
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: 90, upperArm: 150, forearm: -10 },
      { anchor: 'hip', at: [80, 134], torso: -95, thigh: 0, shin: 90, upperArm: 5, forearm: 0 },
    ],
  },
  pushup: {
    view: 'side',
    glyph: 0,
    gear: 'bodyweight',
    frames: [
      { anchor: 'hand', at: [146, GROUND], torso: -25, thigh: 155, shin: 155, foot: 165, upperArm: 90, forearm: 90, neck: -25 },
      { anchor: 'hand', at: [146, GROUND], torso: -15.5, thigh: 164.5, shin: 164.5, foot: 170, upperArm: 160, forearm: 70, neck: -15 },
    ],
  },
  dip: {
    view: 'side',
    glyph: 1,
    gear: 'bodyweight',
    noGround: true,
    scene: [
      [[72, 113], [132, 113]],
      [[84, 113], [84, GROUND]],
    ],
    frames: [
      { anchor: 'hand', at: [100, 110], torso: -90, thigh: 95, shin: 160, foot: 80, upperArm: 90, forearm: 90 },
      { anchor: 'hand', at: [100, 110], torso: -75, thigh: 100, shin: 160, foot: 80, upperArm: 190, forearm: 70, neck: -80 },
    ],
  },
  ohp: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    frames: [
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 60, forearm: -100 },
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: -90, forearm: -90 },
    ],
  },
  raise: {
    view: 'front',
    glyph: 1,
    gear: 'dumbbell',
    cable: [70, GROUND],
    frames: [
      { shoulderY: 62, hipY: 107, elbow: [5, 27], hand: [8, 53], knee: [1, 38], ankle: [1, 76] },
      { shoulderY: 62, hipY: 107, elbow: [27, -2], hand: [52, -4], knee: [1, 38], ankle: [1, 76] },
    ],
  },
  fly: {
    view: 'front',
    glyph: 1,
    gear: 'cable',
    cable: [190, 34],
    frames: [
      { shoulderY: 62, hipY: 107, elbow: [26, 6], hand: [50, 10], knee: [4, 38], ankle: [6, 76] },
      { shoulderY: 62, hipY: 107, elbow: [8, 22], hand: [-11, 28], knee: [4, 38], ankle: [6, 76] },
    ],
  },
  row: {
    view: 'side',
    glyph: 1,
    gear: 'barbell',
    cable: [196, 140],
    frames: [
      { anchor: 'ankle', at: [92, GROUND], thigh: 70, shin: 95, torso: -20, upperArm: 90, forearm: 90, neck: -25 },
      { anchor: 'ankle', at: [92, GROUND], thigh: 70, shin: 95, torso: -20, upperArm: 150, forearm: 80, neck: -25 },
    ],
  },
  vpull: {
    view: 'front',
    glyph: 1,
    gear: 'bodyweight',
    cable: [100, 0],
    noGround: true,
    scene: [[[54, 18], [146, 18]]],
    frames: [
      { shoulderY: 72, hipY: 115, elbow: [8, -26], hand: [16, -52], knee: [1, 37], ankle: [2, 73] },
      { shoulderY: 42, hipY: 85, elbow: [26, 4], hand: [16, -22], knee: [1, 37], ankle: [2, 73] },
    ],
  },
  curl: {
    view: 'side',
    glyph: 1,
    gear: 'dumbbell',
    cable: [150, GROUND],
    frames: [
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 76, forearm: 78 },
      { anchor: 'ankle', at: [95, GROUND], ...stand, upperArm: 80, forearm: -95 },
    ],
  },
  pushdown: {
    view: 'side',
    glyph: 1,
    gear: 'cable',
    cable: [140, 8],
    frames: [
      { anchor: 'ankle', at: [92, GROUND], ...stand, torso: -84, upperArm: 95, forearm: -25 },
      { anchor: 'ankle', at: [92, GROUND], ...stand, torso: -84, upperArm: 95, forearm: 92 },
    ],
  },
  overhead: {
    view: 'side',
    glyph: 1,
    gear: 'dumbbell',
    frames: [
      { anchor: 'ankle', at: [100, GROUND], ...stand, upperArm: -80, forearm: 150 },
      { anchor: 'ankle', at: [100, GROUND], ...stand, upperArm: -80, forearm: -85 },
    ],
  },
  crunch: {
    view: 'side',
    glyph: 1,
    gear: 'bodyweight',
    cable: [12, 120],
    frames: [
      { anchor: 'hip', at: [100, 176], torso: 180, thigh: -50, shin: 50, upperArm: -8, forearm: -8 },
      { anchor: 'hip', at: [100, 176], torso: -148, thigh: -50, shin: 50, upperArm: 18, forearm: 14, neck: -140 },
    ],
  },
  legraise: {
    view: 'side',
    glyph: 1,
    gear: 'bodyweight',
    noGround: true,
    scene: [[[66, 12], [134, 12]]],
    frames: [
      { anchor: 'hand', at: [100, 14], torso: -90, thigh: 92, shin: 92, foot: 60, upperArm: -90, forearm: -90, neck: -90 },
      { anchor: 'hand', at: [100, 14], torso: -96, thigh: -8, shin: 88, foot: 20, upperArm: -88, forearm: -90, neck: -90 },
    ],
  },
  plank: {
    view: 'side',
    glyph: 0,
    gear: 'bodyweight',
    frames: [
      { anchor: 'elbow', at: [140, 180], torso: -12.7, thigh: 167.3, shin: 167.3, foot: 175, upperArm: 90, forearm: 0, neck: -15 },
      { anchor: 'elbow', at: [140, 180], torso: -11.2, thigh: 168.8, shin: 168.8, foot: 175, upperArm: 90, forearm: 0, neck: -15 },
    ],
  },
}

const PLATE = 13

function props(def: PatternDef, j: Joints, gear: Equipment): Shape[] {
  const out: Shape[] = []
  const front = def.view === 'front'
  const anchorFor = (hand: Pt): Pt => {
    const a = def.cable ?? [150, 10]
    return front && hand[0] < CX ? [2 * CX - a[0], a[1]] : a
  }
  if (def.attach === 'sled') {
    const dir = rad(-40)
    const c = step(j.ankle, -40, 6)
    const half = 24
    const n: Pt = [Math.cos(dir + Math.PI / 2) * half, Math.sin(dir + Math.PI / 2) * half]
    out.push({ kind: 'line', role: 'bar', points: [[c[0] - n[0], c[1] - n[1]], [c[0] + n[0], c[1] + n[1]]] })
  }
  if (def.attach === 'pad-front' || def.attach === 'pad-back') {
    out.push({ kind: 'dot', role: 'pad', at: step(j.ankle, j.shin + (def.attach === 'pad-front' ? -90 : 90), 9), r: 7 })
  }

  if (gear === 'cable') {
    for (const hand of j.hands) out.push({ kind: 'line', role: 'cable', points: [anchorFor(hand), hand] })
    for (const hand of j.hands) out.push({ kind: 'dot', role: 'handle', at: hand, r: 4.5 })
  } else if (gear === 'barbell') {
    if (def.weightAtHip) out.push({ kind: 'dot', role: 'plate', at: [j.hip[0], j.hip[1] - 12], r: PLATE })
    else if (front) {
      const [l, r] = j.hands
      out.push({ kind: 'line', role: 'bar', points: [[l[0] - 22, l[1]], [r[0] + 22, r[1]]] })
      out.push({ kind: 'line', role: 'bar', points: [[l[0] - 20, l[1] - 12], [l[0] - 20, l[1] + 12]] })
      out.push({ kind: 'line', role: 'bar', points: [[r[0] + 20, r[1] - 12], [r[0] + 20, r[1] + 12]] })
    } else out.push({ kind: 'dot', role: 'plate', at: j.hands[0], r: PLATE })
  } else if (gear === 'dumbbell') {
    for (const hand of j.hands) out.push({ kind: 'dot', role: 'weight', at: hand, r: 6.5 })
  }
  return out
}

export interface Movement {
  frames: [Shape[], Shape[]]
  /** The frame shown as a still glyph. */
  glyph: 0 | 1
  /** A square viewBox (x, y, size) holding both frames, so nothing is cut off and small figures fill it. */
  box: [number, number, number]
}

/** The two frames (start, end) of an exercise's figure, and which one is its still glyph. */
export function movementFrames(name: string): (Movement & { pattern: Pattern }) | null {
  const pattern = movementOf(name)
  if (!pattern) return null
  return { pattern, ...patternFrames(pattern, equipmentOf(name)) }
}

export function patternFrames(pattern: Pattern, gear: Equipment | null): Movement {
  const def = PATTERNS[pattern]
  const build = (pose: SidePose | FrontPose): Shape[] => {
    const j = def.view === 'side' ? sideJoints(pose as SidePose) : frontJoints(pose as FrontPose)
    const scene: Shape[] = (def.scene ?? []).map((points) => ({ kind: 'line', role: 'scene', points }))
    if (!def.noGround) scene.unshift({ kind: 'line', role: 'scene', points: [[30, GROUND + 2], [170, GROUND + 2]] })
    const extra = props(def, j, gear ?? def.gear)
    // Cables run behind the body, weights sit on the hands, and the head stays on top of a bar on the back.
    const behind = extra.filter((s) => s.role === 'cable' || s.role === 'pad')
    const front = extra.filter((s) => s.role !== 'cable' && s.role !== 'pad')
    const head = j.body.filter((s) => s.kind === 'dot')
    return [...scene, ...behind, ...j.body.filter((s) => s.kind === 'line'), ...front, ...head]
  }
  const frames: [Shape[], Shape[]] = [build(def.frames[0]), build(def.frames[1])]
  return { frames, glyph: def.glyph, box: boxOf(frames) }
}

/** Square bounds of both frames with room for the strokes; at least 170 wide so figures keep a similar scale. */
export function boxOf(frames: readonly Shape[][]): [number, number, number] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  const grow = (x: number, y: number, r: number) => {
    x0 = Math.min(x0, x - r)
    y0 = Math.min(y0, y - r)
    x1 = Math.max(x1, x + r)
    y1 = Math.max(y1, y + r)
  }
  for (const shape of frames.flat()) {
    if (shape.kind === 'line') for (const [x, y] of shape.points) grow(x, y, 0)
    else grow(shape.at[0], shape.at[1], shape.r * 1.3)
  }
  const pad = 10
  const size = Math.max(170, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
  const round = (n: number) => Math.round(n * 10) / 10
  return [round((x0 + x1 - size) / 2), round((y0 + y1 - size) / 2), round(size)]
}

export const PATTERN_NAMES = Object.keys(PATTERNS) as Pattern[]
