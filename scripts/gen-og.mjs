// Generate 1200x630 OG preview images for the two pages.
// Renders SVG templates and rasterizes them with sharp.
// Run with: node scripts/gen-og.mjs

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const W = 1200;
const H = 630;

const BG = '#0c0f14';
const SURFACE = '#151921';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ffffff';
const MUTED = '#9ba3b5';
const ACCENT = '#fbbf24';

// Shared SVG chrome: background, bordered card, footer tag
const frame = (inner) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#11151c"/>
      <stop offset="100%" stop-color="#0a0d12"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  ${inner}
  <text x="60" y="580" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="18" fill="${MUTED}" font-weight="500">
    drewhoover.com/collegiate-championships
  </text>
  <rect x="60" y="600" width="80" height="3" fill="url(#accent)"/>
</svg>`;

// ---- OG 1: Championship grid ----
// We draw a stylized mini-grid that's evocative rather than exact.
const gridCells = () => {
  // 23 sports × 18 years worth of cells (trimmed preview)
  const cols = 23;
  const rows = 14;
  const cellW = 32;
  const cellH = 22;
  const gridX = 620;
  const gridY = 120;
  const palette = [
    '#991b1b', '#1e3a8a', '#c2410c', '#166534', '#7c2d12',
    '#78350f', '#1d4ed8', '#9a3412', '#14532d', '#9f1239',
  ];
  const cells = [];
  // Deterministic pseudo-random fill
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gridX + c * cellW;
      const y = gridY + r * cellH;
      const filled = rand() > 0.18;
      const color = filled ? palette[Math.floor(rand() * palette.length)] : SURFACE;
      cells.push(
        `<rect x="${x}" y="${y}" width="${cellW - 2}" height="${cellH - 2}" rx="2" fill="${color}" opacity="${filled ? 0.85 : 0.35}"/>`,
      );
    }
  }
  return cells.join('\n');
};

const ogGrid = frame(`
  <!-- Title block -->
  <text x="60" y="130" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="28" fill="${MUTED}" font-weight="600" letter-spacing="2">
    NCAA DIVISION I
  </text>
  <text x="60" y="210" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="64" fill="${TEXT}" font-weight="700" letter-spacing="-1">
    Every Champion
  </text>
  <text x="60" y="278" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="64" fill="${TEXT}" font-weight="700" letter-spacing="-1">
    Since 1990
  </text>
  <text x="60" y="340" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="28" fill="${ACCENT}" font-weight="600">
    30 sports · one grid
  </text>
  <text x="60" y="395" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="20" fill="${MUTED}" font-weight="400">
    Hover any cell to trace a school's
  </text>
  <text x="60" y="422" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="20" fill="${MUTED}" font-weight="400">
    entire title history.
  </text>

  <!-- Mini grid illustration -->
  <rect x="600" y="90" width="560" height="420" rx="10" fill="${SURFACE}" stroke="${BORDER}" stroke-width="1"/>
  ${gridCells()}
`);

async function rasterize(svg, name) {
  const outPath = resolve(outDir, name);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`wrote ${outPath}`);
}

await rasterize(ogGrid, 'og-grid.png');
