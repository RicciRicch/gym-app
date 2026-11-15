import type { Equipment } from '../../lib/library'

/** Line icons for the gear an exercise needs (24 x 24, stroke = currentColor). */
const PATHS: Record<Equipment | 'other', string> = {
  // A long bar with a big and a small plate on each side.
  barbell: 'M2 12h20M5.5 5.5v13M8.5 8v8M18.5 5.5v13M15.5 8v8',
  // A short handle with two blocky heads.
  dumbbell: 'M9.5 12h5M3.5 9.5h3v5h-3zM6.5 7h3v10h-3zM14.5 7h3v10h-3zM17.5 9.5h3v5h-3z',
  // A pulley at the top, the cable running down to a D-handle.
  cable: 'M12 2.5v0M14.5 6a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0M12 8.5v6.5M7.5 15h9l-1.5 5h-6z',
  // A frame with a weight stack hanging from a cable.
  machine: 'M3 21h18M5 21V3.5h14V21M12 3.5V8M8.5 8h7v3.5h-7zM8.5 13.5h7V17h-7z',
  // A person standing with arms out.
  bodyweight: 'M13.8 4.5a1.8 1.8 0 1 1-3.6 0a1.8 1.8 0 1 1 3.6 0M4.5 9l7.5 1.5L19.5 9M12 10.5V15M12 15l-4 6M12 15l4 6',
  // Something custom: a star.
  other: 'M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z',
}

export function EquipmentIcon({ equipment, className = 'size-6' }: { equipment: Equipment | null; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[equipment ?? 'other']} />
    </svg>
  )
}
