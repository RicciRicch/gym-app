import { createClient } from '@supabase/supabase-js'
import { createAuthStorage, safeStore } from './auth-storage'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env')
}

export const authStorage = createAuthStorage(
  safeStore(() => window.localStorage),
  safeStore(() => window.sessionStorage),
)

export const supabase = createClient<Database>(url, key, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true },
})

/** Where Supabase auth emails should send the user back to (works on localhost and GitHub Pages). */
export const authRedirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`
