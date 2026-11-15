import { useMemo, useState } from 'react'
import { HEAT_FILL, HEAT_LABEL, heat, muscleLoad, muscleVerdict, REGION_LABEL, REGIONS, type Heat, type MuscleLoad } from '../../lib/muscles'
import { addDays, startOfWeek, toISODate } from '../../lib/schedule'
import { useLoggedSets } from '../progress/api'
import { useExercises } from '../split/api'
import { GorillaHead } from '../workout/CoachTip'
import { MuscleMap } from './MuscleMap'

type Period = 'week' | 'month'

const sets = (n: number) => `${Number(n.toFixed(1))} ${n === 1 ? 'set' : 'sets'}`

/** Progress card: the body lit up by this week's (or the last 30 days') training, with the gorilla's remark. */
export function MuscleMapCard({ className = '' }: { className?: string }) {
  const logged = useLoggedSets()
  const exercises = useExercises()
  const [period, setPeriod] = useState<Period>('week')
  const today = toISODate(new Date())

  const load = useMemo(() => {
    if (!logged.data || !exercises.data) return null
    const muscles = new Map(exercises.data.map((e) => [e.id, e.muscles]))
    const from = period === 'week' ? startOfWeek(today) : addDays(today, -29)
    return muscleLoad(logged.data, muscles, from, today)
  }, [logged.data, exercises.data, period, today])

  return load && <MuscleMapView load={load} days={period === 'week' ? 7 : 30} today={today} period={period} onPeriod={setPeriod} className={className} />
}

/** The card without its data, so it can be previewed. */
export function MuscleMapView({
  load,
  days,
  today,
  period,
  onPeriod,
  className = '',
}: {
  load: MuscleLoad
  days: number
  today: string
  period: Period
  onPeriod: (period: Period) => void
  className?: string
}) {
  const verdict = muscleVerdict(load, today)
  const worked = REGIONS.filter((r) => load[r] > 0).sort((a, b) => load[b] - load[a])
  const cold = REGIONS.filter((r) => load[r] === 0)
  const max = Math.max(1, ...worked.map((r) => load[r]))

  return (
    <section aria-label="Muscle map" className={`rounded-3xl border border-line bg-surface p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">Muscle map</h2>
        <div className="flex rounded-full bg-surface-2 p-1" role="tablist" aria-label="Period">
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => onPeriod(p)}
              className={`min-h-9 rounded-full px-3 text-xs font-bold transition ${period === p ? 'bg-accent text-accent-ink' : 'text-muted'}`}
            >
              {p === 'week' ? 'This week' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
        <GorillaHead />
        <p key={verdict.line} className="min-w-0 flex-1 animate-pop text-sm leading-snug font-bold text-balance">
          {verdict.line}
        </p>
      </div>

      <div className="mt-4">
        <MuscleMap load={load} days={days} tease={verdict.region} />
      </div>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1" aria-label="Legend">
        {([0, 1, 2, 3] as Heat[]).map((level) => (
          <li key={level} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="size-2.5 rounded-full" style={{ background: HEAT_FILL[level] }} />
            {HEAT_LABEL[level]}
          </li>
        ))}
      </ul>

      {worked.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {worked.map((r) => (
            <li key={r} className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-2 text-sm">
              <span className="font-semibold">{REGION_LABEL[r]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(load[r] / max) * 100}%`, background: HEAT_FILL[heat(load[r], days)] }}
                />
              </span>
              <span className="text-right text-xs text-muted tabular-nums">{sets(load[r])}</span>
            </li>
          ))}
        </ul>
      )}
      {cold.length > 0 && worked.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-bold">Cold:</span> {cold.map((r) => REGION_LABEL[r]).join(', ')}
        </p>
      )}
    </section>
  )
}
