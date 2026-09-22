// Bakes every school's logo into a one-color "ink density" stamp at
// public/logos/mono/<slug>.png, plus src/monoLogos.json (slug list) so the
// app knows which stamps exist. Ported from hostile-territory's
// gen-logos.mjs: ink strength comes from darkness OR saturation, so dark
// outlines and saturated fills print, near-white interiors stay open, and
// bright solid marks (a maize M) still print at full strength. Output
// pixels are pure white with variable alpha for the dark canvas; the color
// treatment is a separate <img> stacked on top of the stamp.
// Run once (and again when a school is added); outputs are committed.
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const OUT = 'public/logos/mono';
mkdirSync(OUT, { recursive: true });

// Parse the SCHOOLS map out of championshipData.js — name, ESPN id, logoUrl.
// The mono stamp always uses the standard (light-background) variant: the
// ink formula needs dark-on-light art, and the `darkLogo` variants are
// light-on-dark by design.
const src = readFileSync('src/championshipData.js', 'utf8');
const schools = [];
for (const m of src.matchAll(
  /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z]\w*)):\s*\{ id: (\d+|null),(.*)$/gm,
)) {
  const name = m[1] ?? m[2] ?? m[3];
  const id = m[4] === 'null' ? null : m[4];
  const logoUrl = m[5].match(/logoUrl: '([^']+)'/)?.[1] ?? null;
  if (id || logoUrl) schools.push({ name, id, logoUrl });
}

const slug = (name) => name.replace(/\W+/g, '');
const manifest = [];
const missing = [];
for (const { name, id, logoUrl } of schools) {
  const out = `${OUT}/${slug(name)}.png`;
  if (existsSync(out)) { manifest.push(slug(name)); continue; }
  const url = logoUrl ?? `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'collegiate-championships logo pipeline (drewhoover.com)' },
  });
  if (!res.ok) { missing.push(`${name} (http ${res.status})`); continue; }
  let buf = Buffer.from(await res.arrayBuffer());
  try {
    // density matters only for the SVG sources — rasterize them large enough
    // that the trim/resize below starts from real detail.
    const { data, info } = await sharp(buf, { density: 150 })
      .resize(500, 500, { fit: 'inside', withoutEnlargement: false })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const ink = Math.min(1, Math.max((1 - lum) * 1.2, sat * 0.9));
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
      data[i + 3] = Math.round(data[i + 3] * ink);
    }
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim({ threshold: 10 })
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out);
    manifest.push(slug(name));
  } catch (err) {
    missing.push(`${name} (${err.message})`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
manifest.sort();
writeFileSync('src/monoLogos.json', JSON.stringify(manifest));
console.log(`${manifest.length}/${schools.length} stamps; missing: ${missing.join(', ') || 'none'}`);
