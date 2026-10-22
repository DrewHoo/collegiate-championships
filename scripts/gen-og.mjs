// The social preview images, drawn from the real grid in the site's own
// visual language: the cinder palette, Georgia Bold title, Oswald labels,
// Barlow words, the newest years of the board as one-color stamps with the
// leading school lit in the accent. Run: npm run gen:og (on a Mac: the title
// is Georgia Bold, read from the system; the script throws without it so a
// fallback never gets committed). Re-run after a redesign or a data refresh
// worth committing.
//   public/og-grid.png  1200x630  og:image of the root
//   public/card.png     1200x750  the same at 8:5, the cover the index site's sports list shows
//
// Text is drawn as glyph outlines through opentype.js (pinned 1.3.4: 2.x
// emits NaN path data), so nothing depends on fontconfig: sharp's librsvg
// never finds web fonts and would fall back to a system sans. The OFL fonts
// in scripts/fonts/ are @fontsource's static woff files. Every meaningful
// glyph stays inside the centered 720px column (x 240–960): Reddit's compact
// feed center-crops the 1.91:1 card to a near-square.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import opentype from 'opentype.js'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FONTS = resolve(ROOT, 'scripts', 'fonts')
const OUT = resolve(ROOT, 'public')
const GEORGIA_BOLD = process.env.GEORGIA_BOLD ?? '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
if (!existsSync(GEORGIA_BOLD)) throw new Error(`title font missing: ${GEORGIA_BOLD} (run gen:og on a Mac, or point GEORGIA_BOLD at a Georgia Bold TTF)`)
const font = (f) => opentype.parse(readFileSync(f).buffer.slice(0))
const FONT = {
  Title: font(GEORGIA_BOLD),
  Oswald: font(resolve(FONTS, 'Oswald-Medium.woff')),
  Barlow: font(resolve(FONTS, 'Barlow-Regular.woff')),
  BarlowBold: font(resolve(FONTS, 'Barlow-SemiBold.woff')),
}
// the cinder palette (src/ChampionshipGrid.jsx :root)
const BG = '#2e2a2c', BRIGHT = '#eae4e2', MUTED = '#a29699', ACCENT = '#e2977e', LINE = 'rgba(255,255,255,0.08)'

const width = (str, name, size, spacing = 0) => FONT[name].getAdvanceWidth(str, size, { kerning: true, letterSpacing: spacing / size })
/** one run of text as a filled path; spacing is letter-spacing in px */
function text(str, { x, y, font: name, size, fill, anchor = 'start', spacing = 0 }) {
  const opts = { kerning: true, letterSpacing: spacing / size }
  const w = width(str, name, size, spacing)
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
  return `<path d="${FONT[name].getPath(str, x0, y, size, opts).toPathData(2)}" fill="${fill}"/>`
}
const fit = (str, name, size, maxW) => { while (size > 10 && width(str, name, size) > maxW) size -= 1; return size }
const int = (n) => n.toLocaleString('en-US')

// the site's own model, through vite so the JSON imports and BASE_URL resolve
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' })
const C = await vite.ssrLoadModule('/src/lib/champs.js')
await vite.close()

/** a mono stamp (white with alpha) recolored to a solid, sized, as a data URI */
const stampCache = new Map()
async function stamp(school, size, rgb) {
  const key = `${school}|${size}|${rgb.join()}`
  if (stampCache.has(key)) return stampCache.get(key)
  const file = resolve(OUT, 'logos', 'mono', `${C.slugOf(school)}.png`)
  let uri = null
  if (existsSync(file)) {
    const { data, info } = await sharp(file).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let i = 0; i < data.length; i += 4) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2] }
    const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
    uri = `data:image/png;base64,${png.toString('base64')}`
  }
  stampCache.set(key, uri)
  return uri
}

async function render(W, H) {
  const lead = C.leaderboard[0]
  const cols = C.sortedSports.length
  const cell = 20
  const yearW = 40
  const boardW = yearW + cols * cell // 700 for 33 sports
  const x0 = (W - boardW) / 2
  const headY = 188
  const rowsN = Math.floor((H - headY - 66) / cell)
  // the newest years with a full row of champions (the running year is partial, 2020 was canceled)
  const years = C.descendingYears.filter((y) => C.sortedSports.filter((s) => C.champsOf(s.key, y).length).length >= cols * 0.8).slice(0, rowsN)
  const sub = `${cols} sports in one grid. ${lead.school} leads with ${lead.total} titles; ${int(C.leaderboard.length)} schools have won at least one.`
  const parts = [
    `<rect width="${W}" height="${H}" fill="${BG}"/>`,
    text('NCAA DIVISION I CHAMPIONSHIPS', { x: W / 2, y: 58, font: 'Oswald', size: 17, fill: ACCENT, anchor: 'middle', spacing: 4 }),
    text(`Every champion since ${C.FIRST}`, { x: W / 2, y: 114, font: 'Title', size: 46, fill: BRIGHT, anchor: 'middle' }),
    text(sub, { x: W / 2, y: 150, font: 'Barlow', size: fit(sub, 'Barlow', 21, 720), fill: MUTED, anchor: 'middle' }),
  ]
  const grey = [0xb2, 0xaa, 0xad]
  const lit = [0xe2, 0x97, 0x7e]
  for (let r = 0; r < years.length; r++) {
    const y = headY + r * cell
    const yr = years[r]
    parts.push(text(String(yr), { x: x0 + yearW - 8, y: y + cell - 5, font: 'Oswald', size: 11, fill: yr % 10 === 0 ? BRIGHT : MUTED, anchor: 'end' }))
    parts.push(`<line x1="${x0}" y1="${y + cell}" x2="${x0 + boardW}" y2="${y + cell}" stroke="${LINE}" stroke-width="1"/>`)
    for (let c = 0; c < cols; c++) {
      const champs = C.champsOf(C.sortedSports[c].key, yr)
      if (!champs.length) continue
      const school = champs[0]
      const hero = school === lead.school
      const uri = await stamp(school, 15, hero ? lit : grey)
      if (!uri) continue
      parts.push(`<image href="${uri}" x="${x0 + yearW + c * cell + 2.5}" y="${y + 2.5}" width="15" height="15"${hero ? '' : ' opacity="0.45"'}/>`)
    }
  }
  const titles = C.leaderboard.reduce((n, r) => n + r.total, 0)
  parts.push(text(`${C.FIRST}–${C.LAST} · ${int(titles)} TITLES · ${int(C.leaderboard.length)} SCHOOLS · DREWHOOVER.COM`, { x: W / 2, y: H - 28, font: 'Oswald', size: 14, fill: MUTED, anchor: 'middle', spacing: 2 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('\n')}</svg>`
}

// density 72 renders the SVG at its own size (96 would scale it by 4/3)
const png = (svg) => sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9, palette: true, colors: 192 })
for (const [file, W, H] of [['og-grid.png', 1200, 630], ['card.png', 1200, 750]]) {
  const info = await png(await render(W, H)).toFile(resolve(OUT, file))
  console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)}KB`)
}
