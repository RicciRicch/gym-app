import type { ReactNode } from 'react'
import { heat, HEAT_FILL, REGION_LABEL, type MuscleLoad, type Region } from '../../lib/muscles'

const BODY = '#1a1f26'

// Shapes are drawn for the figure's left half (x < 50) in a 100 x 210 box and mirrored.
const SILHOUETTE_HALF = [
  'M31,33 Q21,34 19,46 L15,74 L11,104 Q11,110 15,110 Q19,110 20,104 L26,76 L30,56 Z', // arm
  'M32,96 Q31,125 34,150 L36,198 Q36,204 41,204 Q46,204 45,198 L47,150 Q49,120 50,100 Z', // leg
]
const TORSO = 'M31,33 Q50,27 69,33 L67,60 Q66,80 68,98 Q50,104 32,98 Q34,80 33,60 Z'

const SHOULDER = 'M32,34 Q22,33 19.5,45 Q26,48 32,43 Z'
const UPPER_ARM = 'M20,48 Q25,46 29.5,49 L26,70 Q21,72 17,69 Z'
const FOREARM = 'M16.5,73 Q21,75 25.5,74 L20.5,101 Q16,103 12.5,100 Z'

interface Shape {
  region: Region
  d: string
  /** Drawn once, not mirrored (it sits on the centre line). */
  centre?: boolean
}

const FRONT: Shape[] = [
  { region: 'shoulders', d: SHOULDER },
  { region: 'chest', d: 'M34,38 Q42,35 49,38 L49,53 Q41,58 34,52 Z' },
  { region: 'biceps', d: UPPER_ARM },
  { region: 'forearms', d: FOREARM },
  { region: 'core', d: 'M38,58 Q50,62 62,58 L61,92 Q50,97 39,92 Z', centre: true },
  { region: 'quads', d: 'M33,101 Q41,104 49,102 L47,146 Q41,149 35,146 Z' },
  { region: 'calves', d: 'M35.5,153 Q41,151 46.5,153 L44.5,192 Q41,194 37.5,192 Z' },
]

const BACK: Shape[] = [
  { region: 'shoulders', d: SHOULDER },
  { region: 'upperBack', d: 'M39,32 Q50,29 61,32 L66,44 L50,58 L34,44 Z', centre: true },
  { region: 'lats', d: 'M33.5,47 L48.5,60 L48,80 Q40,80 35,74 Z' },
  { region: 'lowerBack', d: 'M41,82 L59,82 L60,94 Q50,97 40,94 Z', centre: true },
  { region: 'triceps', d: UPPER_ARM },
  { region: 'forearms', d: FOREARM },
  { region: 'glutes', d: 'M33,98 Q41,95 49.5,98 L49.5,112 Q41,117 33,111 Z' },
  { region: 'hamstrings', d: 'M33.5,115 Q41,119 49,115 L47,146 Q41,149 35,146 Z' },
  { region: 'calves', d: 'M35,152 Q41,149 47,152 Q48,172 44.5,192 Q41,194 37.5,192 Q34,172 35,152 Z' },
]

const mirrored = (node: ReactNode) => <g transform="translate(100 0) scale(-1 1)">{node}</g>

function Figure({
  shapes,
  load,
  days,
  tease,
  label,
  detail,
}: {
  shapes: Shape[]
  load: MuscleLoad
  days: number
  tease: Region | null
  label: string
  detail?: ReactNode
}) {
  const silhouette = SILHOUETTE_HALF.map((d) => <path key={d} d={d} />)
  const region = (s: Shape) => {
    const level = heat(load[s.region], days)
    return (
      <path
        key={s.region}
        d={s.d}
        fill={HEAT_FILL[level]}
        stroke={s.region === tease ? '#ff5c5c' : BODY}
        strokeWidth={s.region === tease ? 1.4 : 1}
        strokeDasharray={s.region === tease ? '3 2' : undefined}
        strokeLinejoin="round"
        className={level === 3 ? 'muscle-fire' : s.region === tease ? 'muscle-missing' : undefined}
      />
    )
  }
  const sides = shapes.filter((s) => !s.centre).map(region)
  return (
    <figure className="flex flex-1 flex-col items-center">
      <svg viewBox="0 0 100 210" className="w-full max-w-36" role="img" aria-label={`${label} of the body`}>
        <g fill={BODY}>
          <circle cx="50" cy="15" r="10.5" />
          <path d="M45,24 h10 v9 h-10 Z" />
          <path d={TORSO} />
          {silhouette}
          {mirrored(silhouette)}
        </g>
        {shapes.filter((s) => s.centre).map(region)}
        {sides}
        {mirrored(sides)}
        {detail}
      </svg>
      <figcaption className="mt-1 text-[11px] font-bold tracking-widest text-muted uppercase">{label}</figcaption>
    </figure>
  )
}

/** Front and back of the body, each muscle region coloured by how much it was trained. */
export function MuscleMap({ load, days, tease }: { load: MuscleLoad; days: number; tease: Region | null }) {
  return (
    <div className="flex justify-center gap-4" aria-label={`Muscle map: ${tease ? `${REGION_LABEL[tease]} untrained` : 'see the list below'}`}>
      <Figure
        shapes={FRONT}
        load={load}
        days={days}
        tease={tease}
        label="Front"
        detail={
          // Ab lines, so the core reads as a six-pack.
          <path d="M50,61 V94 M39.5,70 H60.5 M39.5,81 H60.5" stroke={BODY} strokeWidth="1" fill="none" pointerEvents="none" />
        }
      />
      <Figure
        shapes={BACK}
        load={load}
        days={days}
        tease={tease}
        label="Back"
        detail={<path d="M50,31 V95" stroke={BODY} strokeWidth="1" fill="none" pointerEvents="none" />}
      />
    </div>
  )
}
