import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { FullScreenLoader } from './components/ui'
import { useAuth } from './features/auth/auth-context'
import { useProfile } from './features/auth/useProfile'
import { AuthPage } from './pages/AuthPage'
import { TodayPage } from './pages/TodayPage'

// Today (the landing screen) and auth stay in the main bundle; every other
// route is its own chunk. AppLayout wraps the outlet in <Suspense>.
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const SplitPage = lazy(() => import('./pages/SplitPage').then((m) => ({ default: m.SplitPage })))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage').then((m) => ({ default: m.WorkoutPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const ExerciseProgressPage = lazy(() => import('./pages/ExerciseProgressPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })))
const ExercisePage = lazy(() => import('./pages/ExercisePage').then((m) => ({ default: m.ExercisePage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))

export function App() {
  const { session } = useAuth()
  const profile = useProfile()

  if (session === undefined) return <FullScreenLoader />
  if (!session) return <AuthPage />
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
