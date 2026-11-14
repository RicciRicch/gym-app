import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { FullScreenLoader } from './components/ui'
import { useAuth } from './features/auth/auth-context'
import { useProfile } from './features/auth/useProfile'
import { lazyPage } from './lib/lazy-page'
import { AuthPage } from './pages/AuthPage'
import { NewPasswordPage } from './pages/NewPasswordPage'
import { TodayPage } from './pages/TodayPage'

// Today (the landing screen) and auth stay in the main bundle; every other
// route is its own chunk. AppLayout wraps the outlet in <Suspense>.
const OnboardingPage = lazyPage(() => import('./pages/OnboardingPage'), 'OnboardingPage')
const CalendarPage = lazyPage(() => import('./pages/CalendarPage'), 'CalendarPage')
const SplitPage = lazyPage(() => import('./pages/SplitPage'), 'SplitPage')
const WorkoutPage = lazyPage(() => import('./pages/WorkoutPage'), 'WorkoutPage')
const ProgressPage = lazyPage(() => import('./pages/ProgressPage'), 'ProgressPage')
const ExerciseProgressPage = lazyPage(() => import('./pages/ExerciseProgressPage'), 'default')
const LibraryPage = lazyPage(() => import('./pages/LibraryPage'), 'LibraryPage')
const ExercisePage = lazyPage(() => import('./pages/ExercisePage'), 'ExercisePage')
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'), 'ProfilePage')
// Dev-only playground for the celebration screen; dropped from production builds.
const CelebrationPreview = import.meta.env.DEV
  ? lazyPage(() => import('./dev/CelebrationPreview'), 'CelebrationPreview')
  : null

export function App() {
  const { session, recovering } = useAuth()
  const profile = useProfile()

  // Dev-only: /dev/celebration works without signing in.
  if (CelebrationPreview && window.location.pathname.endsWith('/dev/celebration')) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <CelebrationPreview />
      </Suspense>
    )
  }
  if (session === undefined) return <FullScreenLoader />
  if (!session) return <AuthPage />
  if (recovering) return <NewPasswordPage />
  if (profile.isPending) return <FullScreenLoader />
  if (profile.isError) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-bold">Could not load your profile</p>
          <button className="mt-3 min-h-11 px-4 font-semibold text-accent" onClick={() => profile.refetch()}>
            Try again
          </button>
        </div>
      </main>
    )
  }
  if (!profile.data) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <OnboardingPage />
      </Suspense>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodayPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="split" element={<SplitPage />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="progress/:exerciseId" element={<ExerciseProgressPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/:exerciseId" element={<ExercisePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
