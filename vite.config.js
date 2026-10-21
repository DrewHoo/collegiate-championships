import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single-page build: the championship grid is served at the repo root.
// Extracted from cfb-all-time-records, where it shared a multi-page build
// with a football records table (that table stayed in the old repo).
// `npm run build` runs scripts/prerender.mjs after this so dist/index.html
// carries the rendered page. The sport-header icons are plain files in
// public/icons (not asset imports) so their URLs match between that
// prerender and the client bundle.
export default defineConfig({
  plugins: [react()],
  base: '/collegiate-championships/',
})
