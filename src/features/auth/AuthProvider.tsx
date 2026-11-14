import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { arrivedForRecovery, supabase } from '../../lib/supabase'
import { clearPersistedQueryCache } from '../offline/query-cache'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(arrivedForRecovery)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      // Never show one user's cached data to the next one.
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        clearPersistedQueryCache()
        setRecovering(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, recovering, endRecovery: () => setRecovering(false) }),
    [session, recovering],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
