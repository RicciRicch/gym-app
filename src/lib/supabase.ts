import { createClient } from '@supabase/supabase-js'
import { createAuthStorage, safeStore } from './auth-storage'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env')
}

// Read the auth redirect details before the client consumes and clears the URL hash.
const redirectParams = new URLSearchParams(window.location.hash.slice(1))
/** True when the user just arrived from a "reset password" email link. */
export const arrivedForRecovery = redirectParams.get('type') === 'recovery'
/** Error from an auth email link (for example an expired reset link). */
export const authLinkError = redirectParams.get('error_description')
// The error is shown on the login screen; keep it out of the address bar.
if (authLinkError) history.replaceState(null, '', window.location.pathname + window.location.search)

export const authStorage = createAuthStorage(
  safeStore(() => window.localStorage),
  safeStore(() => window.sessionStorage),
)

export const supabase = createClient<Database>(url, key, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true },
})

/** Where Supabase auth emails should send the user back to (works on localhost and GitHub Pages). */
export const authRedirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`
