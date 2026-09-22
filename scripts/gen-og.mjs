// Generate the 1200x630 OG preview image.
// Renders an SVG frame, then composites the real one-color logo stamps
// (public/logos/mono/) into a mini-board with one school lit in its brand
// color — mirroring the site's monochrome-board / color-is-the-highlight
// identity. Run with: node scripts/gen-og.mjs
//
// Fonts: librsvg (sharp's SVG backend) can't load the site's web fonts, so
// the title falls back to a condensed system sans. The look is close; the
// copy and board are what matter for the share card.

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public');
mkdirSync(outDir, { recursive: true });

const W = 1200;
const H = 630;

// Cinder-track theme (matches src/ChampionshipGrid.jsx :root).
const BG = '#2e2a2c';
const SURFACE = '#363134';
const BORDER = 'rgba(255,255,255,0.08)';
const BRIGHT = '#eae4e2';
const MUTED = '#a29699';
const ACCENT = '#e2977e';

// The lit school and its brand color, from SCHOOLS. Wisconsin's bright
// red reads on the dark card (Stanford's #8c1515 cardinal is too dark),
// and the block-W stamp is recognizable at this size.
const HERO = 'Wisconsin';
const HERO_RGB = { r: 0xc5, g: 0x05, b: 0x0c };
// A warm light grey for the recessive stamps — the muted "board".
const STAMP_GREY = { r: 0xb2, g: 0xaa, b: 0xad };

const TITLE_FONT = "Oswald, 'Barlow Condensed', 'Arial Narrow', Helvetica, Arial, sans-serif";
const BODY_FONT = "Barlow, Helvetica, Arial, sans-serif";

// --- Mini-board geometry -----------------------------------------------------
const CARD = { x: 596, y: 70, w: 544, h: 490 };
const COLS = 14;
const ROWS = 13;
const PAD = 14;
const cellW = (CARD.w - PAD * 2) / COLS;
const cellH = (CARD.h - PAD * 2) / ROWS;
const stampSize = Math.round(Math.min(cellW, cellH) * 0.82);

// Deterministic PRNG so the card is stable across builds.
let seed = 1972;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const slugs = JSON.parse(readFileSync(resolve(root, 'src', 'monoLogos.json'), 'utf8'))
  .filter((s) => s !== HERO.replace(/\W+/g, ''));
const heroSlug = HERO.replace(/\W+/g, '');

// Assign each filled cell a school; ~1 in 7 cells is the hero (lit), the
// rest are muted greyscale stamps, ~16% left empty.
const layout = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (rand() < 0.16) continue; // empty cell
    const hero = rand() < 0.14;
    layout.push({
      r,
      c,
      slug: hero ? heroSlug : slugs[Math.floor(rand() * slugs.length)],
      hero,
    });
  }
}

const frame = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="64" y="140" font-family="${TITLE_FONT}" font-size="27" fill="${MUTED}" font-weight="500" letter-spacing="3">NCAA DIVISION I</text>
  <text x="62" y="212" font-family="${TITLE_FONT}" font-size="62" fill="${BRIGHT}" font-weight="600" letter-spacing="1">EVERY CHAMPION</text>
  <text x="62" y="278" font-family="${TITLE_FONT}" font-size="62" fill="${BRIGHT}" font-weight="600" letter-spacing="1">SINCE 1972</text>
  <text x="64" y="336" font-family="${TITLE_FONT}" font-size="27" fill="${ACCENT}" font-weight="500" letter-spacing="1">33 SPORTS · ONE GRID</text>
  <text x="64" y="392" font-family="${BODY_FONT}" font-size="20" fill="${MUTED}">Every NCAA D-I national champion, laid</text>
  <text x="64" y="419" font-family="${BODY_FONT}" font-size="20" fill="${MUTED}">out as a board of team logos. Pick a</text>
  <text x="64" y="446" font-family="${BODY_FONT}" font-size="20" fill="${MUTED}">school to trace every title it has won.</text>
  <rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" rx="10" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1"/>
  <text x="64" y="586" font-family="${BODY_FONT}" font-size="18" fill="${MUTED}" font-weight="500">drewhoover.com/collegiate-championships</text>
  <rect x="64" y="602" width="80" height="3" fill="${ACCENT}"/>
</svg>`;

async function main() {
  const base = sharp(Buffer.from(frame)).png();

  // Recolor a white-alpha stamp to a solid color, keeping its shape (the
  // alpha channel). sharp.tint() preserves luminance, so it can't darken a
  // white stamp — we set RGB directly and leave alpha untouched.
  const recolor = async (slug, color) => {
    const { data, info } = await sharp(resolve(outDir, 'logos', 'mono', `${slug}.png`))
      .resize(stampSize, stampSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer();
  };

  const composites = [];
  const cache = new Map();
  for (const { r, c, slug, hero } of layout) {
    const key = `${slug}:${hero ? 'hero' : 'grey'}`;
    let buf = cache.get(key);
    if (!buf) {
      buf = await recolor(slug, hero ? HERO_RGB : STAMP_GREY);
      cache.set(key, buf);
    }
    const left = Math.round(CARD.x + PAD + c * cellW + (cellW - stampSize) / 2);
    const top = Math.round(CARD.y + PAD + r * cellH + (cellH - stampSize) / 2);
    composites.push({ input: buf, left, top });
  }

  const outPath = resolve(outDir, 'og-grid.png');
  await base
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`wrote ${outPath} (${composites.length} stamps, hero: ${HERO})`);
}

await main();
