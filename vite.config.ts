/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { serviceWorker } from './scripts/service-worker-plugin.mjs'

// Served from https://ricciricch.github.io/gym-app/
export default defineConfig({
  base: '/gym-app/',
  plugins: [react(), tailwindcss(), serviceWorker()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
