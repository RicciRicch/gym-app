import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { fromISODate } from '../../lib/schedule'
import { formatTopSet, type ExerciseProgress, type ProgressPoint } from '../../lib/progress'

// Single series, so no legend: the page title names it. Brand lime passes 3:1
// contrast on the surface. PRs are never color-only: larger marker + "PR" label.

const ACCENT = '#c8ff2e'
const SURFACE = '#14181d'
const GRID = '#2a313a'
const MUTED = '#8b96a3'

const shortDate = (iso: string) => fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

interface Datum extends ProgressPoint {
  value: number
  label: string
}

export function ProgressChart({ progress }: { progress: ExerciseProgress }) {
  const data: Datum[] = progress.points.map((p, i) => ({
    ...p,
    value: progress.metric === 'weight' ? p.weight : p.reps,
    // Two sessions on one day still get distinct x positions.
    label: `${shortDate(p.date)}${progress.points.filter((q, j) => j < i && q.date === p.date).length ? ' ·' : ''}`,
  }))
  // Round the y-domain to a step so ticks land on readable numbers (55, 60, 65…).
  const step = progress.metric === 'weight' ? 5 : 2
  const values = data.map((d) => d.value)
  const lo = Math.max(0, Math.floor((Math.min(...values) * 0.95) / step) * step)
  let hi = Math.ceil((Math.max(...values) * 1.03) / step) * step
  // At most ~5 gridlines: widen the step for big ranges.
  let tickStep = step
  while ((hi - lo) / tickStep > 5) tickStep += step
  hi = lo + Math.ceil((hi - lo) / tickStep) * tickStep
  const ticks = Array.from({ length: (hi - lo) / tickStep + 1 }, (_, i) => lo + i * tickStep)

  return (
    <figure className="rounded-3xl border border-line bg-surface p-3 pt-4">
      <figcaption className="px-2 text-sm font-semibold text-muted">
        Top set {progress.metric === 'weight' ? 'weight (kg)' : 'reps (bodyweight)'} per workout
      </figcaption>
      <div className="mt-2 h-56" role="img" aria-label={`Line chart of top set ${progress.metric} over ${data.length} workouts`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 22, right: 14, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
            <XAxis
              dataKey="label"
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              width={40}
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[lo, hi]}
              ticks={ticks}
            />
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={ACCENT}
              strokeWidth={2}
              isAnimationActive={data.length < 60}
              dot={(props) => <PointDot key={props.index} {...(props as DotProps)} />}
              activeDot={{ r: 6, fill: ACCENT, stroke: SURFACE, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

interface DotProps {
  cx?: number
  cy?: number
  index?: number
  payload?: Datum
}

function PointDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null
  if (!payload.isPR) return <circle cx={cx} cy={cy} r={4} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={6.5} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#f2f5f7" fontSize={10} fontWeight={800}>
        PR
      </text>
    </g>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const d = payload?.[0]?.payload as Datum | undefined
  if (!active || !d) return null
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm shadow-lg">
      <p className="text-muted">{fromISODate(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      <p className="font-bold text-text">
        {formatTopSet(d)}
        {d.isPR && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-black text-accent-ink">PR</span>}
      </p>
    </div>
  )
}
