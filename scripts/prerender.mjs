// Runs after `vite build`. Bakes the rendered grid into dist/index.html,
// adds WebPage JSON-LD, and writes dist/sitemap.xml.
//
// Without this the deployed page is `<div id="root"></div>` and every word on
// it exists only after React runs. Google usually renders JS in a deferred
// second pass; Bing, DuckDuckGo, social unfurlers, and the LLM crawlers
// largely don't. The <head> itself stays in index.html; this only fills the
// body.
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { llmsText } from './lib/llms.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://drewhoover.com'
const SITE = `${ORIGIN}/collegiate-championships/`
const OUT = path.join(ROOT, 'dist/index.html')

const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
})
const { default: App } = await vite.ssrLoadModule('/src/ChampionshipGrid.jsx')
// the model and the words, through Vite so the JSON import resolves the way the page's does
const C = await vite.ssrLoadModule('/src/lib/champs.js')
const W = await vite.ssrLoadModule('/src/lib/share.js')
const { SIBLINGS } = await vite.ssrLoadModule('/src/lib/siblings.js')
const appHtml = renderToString(React.createElement(App))
await vite.close()

let html = fs.readFileSync(OUT, 'utf8')

// Throw rather than no-op: a Vite change that renames the marker would
// otherwise quietly ship an empty page again.
if (!html.includes('<div id="root"></div>')) {
  throw new Error('prerender: could not find an empty #root in dist/index.html')
}

const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
if (!title || !description) {
  throw new Error('prerender: could not read <title> and description from dist/index.html')
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': SITE,
      url: SITE,
      name: title,
      description,
      isPartOf: { '@type': 'WebSite', url: `${ORIGIN}/`, name: 'drewhoover.com' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'drewhoover.com', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: title, item: SITE },
      ],
    },
  ],
}

html = html.replace(
  '</head>',
  `    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`,
)
html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
fs.writeFileSync(OUT, html)

// Single-page sitemap: what Search Console wants submitted, and it carries lastmod.
fs.writeFileSync(
  path.join(ROOT, 'dist/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </url>
</urlset>
`,
)

// llms.txt (llmstxt.org): the site in plain markdown for a language model
fs.writeFileSync(
  path.join(ROOT, 'dist/llms.txt'),
  llmsText({ site: SITE, title, description: W.shareDescription({ s: [] }), first: C.FIRST, last: C.LAST, sports: C.SPORTS.length, schools: C.leaderboard.length, siblings: SIBLINGS }),
)

const words = appHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
console.log(`prerendered ${(appHtml.length / 1024).toFixed(0)}KB into #root (~${words} words)`)
