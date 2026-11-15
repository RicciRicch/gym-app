import { useId, type ReactNode } from 'react'
import { heat, REGION_LABEL, type Heat, type MuscleLoad, type Region } from '../../lib/muscles'
import { BACK, FRONT, GAP, HEAT_GRADIENT, SILHOUETTE, SKIN, type Shape } from './body-shapes'

const mirrored = (node: ReactNode) => <g transform="translate(200 0) scale(-1 1)">{node}</g>

interface MapProps {
  load: MuscleLoad
  days: number
  /** The region the gorilla is teasing about: dashed red outline. */
  tease: Region | null
  /** The region the user tapped: white outline. */
  selected: Region | null
  onSelect: (region: Region | null) => void
}

function Figure({ shapes, load, days, tease, selected, onSelect, label, detail }: MapProps & { shapes: Shape[]; label: string; detail: ReactNode }) {
  const id = useId()
  const muscles = shapes.map((s, i) => {
    const level = heat(load[s.region], days)
    const picked = s.region === selected
    const teased = s.region === tease && !picked
    return (
      <path
        key={i}
        d={s.d}
        fill={`url(#${id}h${level})`}
        stroke={picked ? '#ffffff' : teased ? '#ff5c5c' : GAP}
        strokeWidth={picked ? 1.8 : teased ? 1.6 : 1.1}
        strokeDasharray={teased ? '4 2.5' : undefined}
        strokeLinejoin="round"
        className={`cursor-pointer ${level === 3 ? 'muscle-fire' : ''} ${teased ? 'muscle-missing' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(picked ? null : s.region)
        }}
      >
        <title>{REGION_LABEL[s.region]}</title>
      </path>
    )
  })
  // Outlined muscles are drawn last, so their outline is not covered by neighbours.
  const order = (nodes: typeof muscles) => {
    const on = (i: number) => shapes[i].region === selected || shapes[i].region === tease
    return [...nodes.filter((_, i) => !on(i)), ...nodes.filter((_, i) => on(i))]
  }

  return (
    <figure className="flex flex-1 flex-col items-center">
      <svg viewBox="0 0 200 440" className="w-full max-w-40" role="img" aria-label={`${label} of the body`} onClick={() => onSelect(null)}>
        <defs>
          {([0, 1, 2, 3] as Heat[]).map((level) => (
            <linearGradient key={level} id={`${id}h${level}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={HEAT_GRADIENT[level][0]} />
              <stop offset="1" stopColor={HEAT_GRADIENT[level][1]} />
            </linearGradient>
          ))}
          <linearGradient id={`${id}skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKIN[0]} />
            <stop offset="1" stopColor={SKIN[1]} />
          </linearGradient>
          <radialGradient id={`${id}floor`}>
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          {/* A thin light rim around the whole silhouette. */}
          <filter id={`${id}rim`} x="-10%" y="-5%" width="120%" height="110%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="grown" />
            <feFlood floodColor="#3a4553" />
            <feComposite in2="grown" operator="in" result="rim" />
            <feMerge>
              <feMergeNode in="rim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="100" cy="424" rx="52" ry="7" fill={`url(#${id}floor)`} />
        <g fill={`url(#${id}skin)`} filter={`url(#${id}rim)`}>
          <ellipse cx="100" cy="27" rx="17.5" ry="21" />
          <path d={SILHOUETTE} />
          {mirrored(<path d={SILHOUETTE} />)}
        </g>
        {detail}
        {order(muscles)}
        {mirrored(order(muscles))}
      </svg>
      <figcaption className="mt-1 text-[11px] font-bold tracking-widest text-muted uppercase">{label}</figcaption>
    </figure>
  )
}

/** Soft lines that are not muscles: collarbones, knees, elbows. */
const line = (d: string) => <path d={d} fill="none" stroke="#343d49" strokeWidth="1.2" strokeLinecap="round" />
const both = (node: ReactNode) => (
  <g pointerEvents="none">
    {node}
    {mirrored(node)}
  </g>
)

const FRONT_DETAIL = both(
  <>
    {line('M70,70.5 Q84,66.5 97,70')}
    {line('M72,289 Q78,296 85,289')}
    {line('M73,293 Q78,299 84,293')}
    {line('M88,190 Q93,198 99,201')}
  </>,
)
const BACK_DETAIL = both(
  <>
    {line('M70,288 Q78,292 87,288')}
    {line('M44,154 Q47,157 51,155')}
    {line('M76,372 Q78,385 78,396')}
  </>,
)

/** Front and back of the body, each muscle coloured by how much it was trained. Tap a muscle to select it. */
export function MuscleMap(props: MapProps) {
  return (
    <div className="flex justify-center gap-2">
      <Figure {...props} shapes={FRONT} label="Front" detail={FRONT_DETAIL} />
      <Figure {...props} shapes={BACK} label="Back" detail={BACK_DETAIL} />
    </div>
  )
}
