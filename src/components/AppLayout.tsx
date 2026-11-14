import { Suspense, type ReactNode } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { useAuth } from '../features/auth/auth-context'
import { useProfile } from '../features/auth/useProfile'
import { GuideOverlay } from '../features/guide/GuideOverlay'
import { closeGuide, useGuideOpen } from '../features/guide/guide-store'
import { useActiveSplit } from '../features/split/api'
import { useOnline } from '../features/offline/online'
import { Avatar, PageLoader, TopProgressBar, Wordmark } from './ui'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
)

const tabs = [
  { to: '/', label: 'Today', icon: icon(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />) },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: icon(
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>,
    ),
  },
  { to: '/split', label: 'Split', icon: icon(<path d="M4 6h16M4 12h10M4 18h13" />) },
  { to: '/progress', label: 'Progress', icon: icon(<path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7" />) },
  {
    to: '/library',
    label: 'Library',
    icon: icon(<path d="M2 12h2m16 0h2M6 7v10M18 7v10M9 9v6m6-6v6M9 12h6" />),
  },
]

export function AppLayout() {
  const { data: profile } = useProfile()
  const { user } = useAuth()
  const guideOpen = useGuideOpen(user?.id)
  const split = useActiveSplit()
  const busy = useIsFetching() + useIsMutating() > 0
  const online = useOnline()
  const { pathname } = useLocation()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <TopProgressBar active={busy && online} />
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/85 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <Wordmark className="text-lg" />
        <Link to="/profile" aria-label="Profile" className="grid size-11 place-items-center rounded-full transition active:scale-95">
          {profile && <Avatar avatarKey={profile.avatar_key} className="size-9 ring-2 ring-line" />}
        </Link>
      </header>
      {!online && (
        <p role="status" className="mx-5 mb-3 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm text-muted">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.17-2.75M19 13a10 10 0 0 0-2.3-1.6M2 8.82a15 15 0 0 1 4.17-2.65M22 8.82A15 15 0 0 0 11 5.06M12 20h.01" />
          </svg>
          <span>
            <span className="font-semibold text-text">You are offline.</span> Showing data saved on this phone.
          </span>
        </p>
      )}

      <main className="flex-1 px-5 pb-28">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-line bg-surface/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex min-h-16 min-w-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95 ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {guideOpen && user && <GuideOverlay hasSplit={!!split.data} onClose={() => closeGuide(user.id)} />}
    </div>
  )
}
