import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export const MIN_PASSWORD = 8

export interface AuthState {
  /** undefined while the initial session is loading */
  session: Session | null | undefined
  user: User | null
  /** Signed in through a reset-password link: ask for a new password first. */
  recovering: boolean
  endRecovery: () => void
}

export const AuthContext = createContext<AuthState>({
  session: undefined,
  user: null,
  recovering: false,
  endRecovery: () => {},
})

export const useAuth = () => useContext(AuthContext)
