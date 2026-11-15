import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageLoader } from '../components/ui'
import { useAuth } from '../features/auth/auth-context'
import { markBadgesSeen, useBadges, useNewBadges } from '../features/badges/api'
import { BadgeShelf } from '../features/badges/BadgeShelf'
import type { ShelfState } from '../features/badges/BadgeUnlock'

/** The badge shelf; badges the user has not seen yet fly into their slots. */
export function BadgesPage() {
  const { user } = useAuth()
  const states = useBadges()
  const fresh = useNewBadges(states)
  const location = useLocation()
  const navigate = useNavigate()
  const [from] = useState(() => (location.state as ShelfState | null)?.from)
  if (!states) return <PageLoader />
  return (
    <BadgeShelf
      states={states}
      fresh={fresh}
      from={from}
      onSeen={(ids) => user && markBadgesSeen(user.id, ids)}
      // Drop the start position so a reload doesn't replay anything.
      onFlightEnd={() => navigate('/badges', { replace: true, state: null })}
    />
  )
}
