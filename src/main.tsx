import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { reloadForNewVersion } from './lib/lazy-page'
import { AuthProvider } from './features/auth/AuthProvider'
import { persistQueryCache, restoreQueryCache } from './features/offline/query-cache'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    // Keep data around long enough to be saved for offline use.
    queries: { staleTime: 30_000, retry: 1, gcTime: 24 * 60 * 60 * 1000 },
    // Fail fast with a clear message offline instead of waiting silently.
    mutations: { networkMode: 'always' },
  },
})
restoreQueryCache(queryClient)

// A chunk from an older deploy failed to load: reload once to get the new version.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

persistQueryCache(queryClient)

// Offline support (production only; the dev server changes files constantly).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is a bonus; the app works without it */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fullScreen>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
