import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single-page build: the championship grid is served at the repo root.
// Extracted from cfb-all-time-records, where it shared a multi-page build
// with a football records table (that table stayed in the old repo).
export default defineConfig({
  plugins: [react()],
  base: '/collegiate-championships/',
})
