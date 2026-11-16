import { Link, useParams } from 'react-router-dom'
import { ExerciseImage } from '../components/ExerciseImage'
import { PageLoader } from '../components/ui'
import { EquipmentIcon } from '../features/library/EquipmentIcon'
import { MaxCard } from '../features/progress/MaxCard'
import { useLoggedSets } from '../features/progress/api'
import { useExercises } from '../features/split/api'
import { EQUIPMENT_LABEL, equipmentOf } from '../lib/library'
import { exerciseProgress, formatTopSet } from '../lib/progress'

/** Library detail: image, target muscles, form cues and a link to progress. */
export function ExercisePage() {
  const { exerciseId } = useParams()
  const { data: exercises, isPending } = useExercises()
  const sets = useLoggedSets()
  const exercise = exercises?.find((e) => e.id === exerciseId)

  if (isPending) {
    return (
      <PageLoader label="Loading exercise" />
    )
  }
  if (!exercise) {
    return (
      <div className="pt-16 text-center">
        <p className="font-bold">Exercise not found</p>
        <Link to="/library" className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent">
          Back to library
        </Link>
      </div>
    )
  }

  const equipment = equipmentOf(exercise.name)
  const exerciseSets = sets.data?.filter((s) => s.exerciseId === exercise.id) ?? []
  const progress = exerciseProgress(exerciseSets)

  return (
    <div className="animate-fade-up pt-2">
      <Link to="/library" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Library
      </Link>

      {exercise.image_key && (
        <ExerciseImage imageKey={exercise.image_key} name={exercise.name} className="mt-2 aspect-square w-full rounded-3xl" />
      )}

      <h1 className={`${exercise.image_key ? 'mt-5' : 'mt-2'} text-3xl font-black tracking-tight`}>{exercise.name}</h1>
      {equipment && (
        <p className="mt-2 flex items-center gap-2 font-semibold text-muted">
          <EquipmentIcon equipment={equipment} className="size-5 text-accent" />
          {EQUIPMENT_LABEL[equipment]}
        </p>
      )}
      {exercise.muscles.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Target muscles">
          {exercise.muscles.map((m) => (
            <li key={m} className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
              {m}
            </li>
          ))}
        </ul>
      )}

      {exercise.cues.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-bold">Form cues</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {exercise.cues.map((cue, i) => (
              <li key={cue} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-accent-ink">{i + 1}</span>
                <span className="pt-0.5">{cue}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="mt-4 text-muted">Custom exercise.</p>
      )}

      {progress.metric === 'weight' && progress.points.length > 0 ? (
        <MaxCard className="mt-6" exerciseId={exercise.id} sets={exerciseSets} progress={progress} />
      ) : (
        <Link
          to={`/progress/${exercise.id}`}
          className="mt-6 flex min-h-16 items-center justify-between rounded-3xl border border-line bg-surface px-5 transition active:scale-[0.98]"
        >
          <span>
            <span className="block font-bold">Your progress</span>
            <span className="block text-sm text-muted">
              {progress.best ? `Best: ${formatTopSet(progress.best)} · ${progress.points.length} sessions` : 'No sessions logged yet'}
            </span>
          </span>
          <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  )
}
