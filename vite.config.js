import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single-page build: the championship grid is served at the repo root.
// Extracted from cfb-all-time-records, where it shared a multi-page build
// with a football records table (that table stayed in the old repo).
export default defineConfig({
  plugins: [react()],
  base: '/collegiate-championships/',
  build: {
    // Sport-header icons are imported as ?url and used as CSS mask sources
    // via a custom property (--icon: url(...)). Vite inlines assets under
    // 4 KB as data: URIs, but an inlined SVG data URI breaks the url() when
    // it lands inside an inline-style custom property — the CSS parser
    // rejects it and --icon computes to empty, so 13 of the 17 icons (the
    // small ones) render as blank squares in production while dev, which
    // never inlines, looks fine. Emitting every asset as a file keeps the
    // icon URLs consistent between dev and prod.
    assetsInlineLimit: 0,
  },
})
