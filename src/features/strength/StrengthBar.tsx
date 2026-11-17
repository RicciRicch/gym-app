import { LEVELS } from '../../lib/strength'

/** Five segments, Beginner to Elite, filled up to `position` (0..5). */
export function StrengthBar({ position, labels = false, className = '' }: { position: number; labels?: boolean; className?: string }) {
  const current = Math.floor(Math.min(position, LEVELS.length - 0.001))
  return (
    <div className={className} aria-hidden="true">
      <div className="flex gap-1">
        {LEVELS.map((level, i) => {
          const fill = Math.min(1, Math.max(0, position - i))
          return (
            <span key={level} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${fill * 100}%` }} />
            </span>
          )
        })}
      </div>
      {labels && (
        <div className="mt-1.5 flex">
          {LEVELS.map((level, i) => (
            <span key={level} className={`flex-1 truncate text-[10px] font-semibold ${current === i ? 'text-text' : 'text-muted'}`}>
              {level === 'Intermediate' ? 'Interm.' : level}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
