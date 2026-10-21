import React from 'react'
import ReactDOM from 'react-dom/client'
import ChampionshipGrid from './ChampionshipGrid.jsx'

// hydrateRoot, not createRoot: dist/index.html carries the prerendered page
// (scripts/prerender.mjs) and createRoot would throw that DOM away.
ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <React.StrictMode>
    <ChampionshipGrid />
  </React.StrictMode>,
)
