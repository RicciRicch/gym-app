import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  /** undefined while the initial session is loading */
  session: Session | null | undefined
  user: User | null
}

export const AuthContext = createContext<AuthState>({ session: undefined, user: null })

export const useAuth = () => useContext(AuthContext)
