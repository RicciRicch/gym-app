import { muscleRoles, REGIONS, type MuscleLoad } from '../../lib/muscles'
import { MuscleMap } from './MuscleMap'

const noop = () => {}

/** The whole body, front and back, with the exercise's main muscle on fire and the helpers warm. */
export function MusclesWorked({ muscles, className = '' }: { muscles: readonly string[]; className?: string }) {
  const roles = muscleRoles(muscles)
  if (roles.size === 0) return null
  // Weekly heat levels: 10+ sets = on fire, anything = warm.
  const load = Object.fromEntries(REGIONS.map((r) => [r, roles.get(r) === 'main' ? 10 : roles.get(r) ? 1 : 0])) as MuscleLoad
  return (
    <section className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>
      <h2 className="text-lg font-bold">Muscles worked</h2>
      <div className="mt-3">
        <MuscleMap load={load} days={7} tease={null} selected={null} onSelect={noop} />
      </div>
      <ul className="mt-3 flex justify-center gap-5 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-gradient-to-b from-[#ffd667] to-[#ff9f1c]" aria-hidden="true" />
          Main
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-gradient-to-b from-[#b0621d] to-[#7a430f]" aria-hidden="true" />
          Helpers
        </li>
      </ul>
    </section>
  )
}
