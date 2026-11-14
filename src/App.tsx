import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { FullScreenLoader } from './components/ui'
import { useAuth } from './features/auth/auth-context'
import { useProfile } from './features/auth/useProfile'
import { AuthPage } from './pages/AuthPage'
import { CalendarPage } from './pages/CalendarPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { SplitPage } from './pages/SplitPage'
import { TodayPage } from './pages/TodayPage'
import { WorkoutPage } from './pages/WorkoutPage'

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
  if (!profile.data) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodayPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="split" element={<SplitPage />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="progress" element={<ComingSoonPage title="Progress" milestone="M5" />} />
        <Route path="library" element={<ComingSoonPage title="Library" milestone="M5" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
