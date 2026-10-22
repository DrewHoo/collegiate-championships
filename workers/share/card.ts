// The share card: a school's titles, or several schools side by side, drawn
// as a 1200x630 PNG through workers-og (satori + resvg wired for workerd).
// The design follows scripts/gen-og.mjs: the cinder palette, Oswald labels
// and counts, Barlow words. Fonts ride in the bundle (OFL, @fontsource's
// static woff files; satori can't read a variable font).
import { ImageResponse } from 'workers-og';
import oswald from './fonts/Oswald-Medium.woff';
import barlow from './fonts/Barlow-Regular.woff';
import barlowBold from './fonts/Barlow-SemiBold.woff';

const BG = '#2e2a2c', TEXT = '#e3dedd', BRIGHT = '#eae4e2', MUTED = '#a29699', ACCENT = '#e2977e', LINE = 'rgba(255,255,255,0.1)';

export interface CardRow {
  rank: string;
  name: string;
  /** small print under the name */
  span: string;
  value: string;
  /** a data URI, drawn before the name */
  logo?: string | null;
}
export interface Card {
  /** "STANFORD · 136 NATIONAL TITLES" */
  heading: string;
  /** a data URI beside the heading (the school's mark) */
  headLogo?: string | null;
  /** the whole sentence */
  words: string;
  rows: CardRow[];
  /** "#1 OF 183 SCHOOLS · 1972–2026 · 33 SPORTS · DREWHOOVER.COM" */
  footer: string;
}

// satori reads the text as-is, entities included, so only the characters
// that would open a tag or close an attribute are escaped
const esc = (s: string) => s.replace(/</g, '&lt;').replace(/"/g, '&quot;');
// the heading is one line inside the 720px column: Oswald runs about 0.5em a
// character, so a long one drops its size rather than wrapping
export const headingSize = (heading: string): number => Math.max(22, Math.min(38, Math.floor(720 / (0.5 * Math.max(1, heading.length)))));

export function renderCard(card: Card): Response {
  const rowH = 62;
  const rows = card.rows.map((r) => `
    <div style="display:flex; flex-direction:row; align-items:center; gap:14px; height:${rowH}px; padding:0 10px; margin:0 -10px; border-bottom:1px solid ${LINE};">
      <div style="display:flex; justify-content:flex-end; width:40px; font-family:'Oswald'; font-size:16px; letter-spacing:1px; color:${r.rank === '1' ? BRIGHT : MUTED};">${esc(r.rank)}</div>
      ${r.logo ? `<img src="${r.logo}" width="36" height="36" style="width:36px; height:36px; object-fit:contain;" />` : '<div style="display:flex; width:0px;"></div>'}
      <div style="display:flex; flex-direction:column; flex-grow:1; width:${r.logo ? 440 : 490}px;">
        <div style="display:flex; font-family:'Barlow'; font-weight:600; font-size:24px; color:${TEXT}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(r.name)}</div>
        <div style="display:flex; font-family:'Oswald'; font-size:12px; letter-spacing:1px; color:${MUTED}; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(r.span.toUpperCase())}</div>
      </div>
      <div style="display:flex; justify-content:flex-end; width:150px; font-family:'Oswald'; font-size:34px; color:${BRIGHT};">${esc(r.value)}</div>
    </div>`).join('');

  // every meaningful glyph stays inside the centered 720px column: Reddit's
  // compact feed center-crops the 1.91:1 card to a near-square thumbnail
  const html = `
  <div style="display:flex; flex-direction:column; align-items:center; width:1200px; height:630px; background-color:${BG}; padding:40px 0 32px;">
    <div style="display:flex; font-family:'Oswald'; font-size:17px; letter-spacing:4px; color:${ACCENT};">NCAA DIVISION I CHAMPIONSHIPS</div>
    <div style="display:flex; flex-direction:row; align-items:center; gap:14px; margin-top:10px; max-width:720px;">
      ${card.headLogo ? `<img src="${card.headLogo}" width="44" height="44" style="width:44px; height:44px; object-fit:contain;" />` : ''}
      <div style="display:flex; font-family:'Oswald'; font-size:${headingSize(card.heading)}px; letter-spacing:1px; color:${BRIGHT}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(card.heading.toUpperCase())}</div>
    </div>
    <div style="display:flex; font-family:'Barlow'; font-size:21px; color:${MUTED}; margin-top:4px; max-width:720px; text-align:center;">${esc(card.words)}</div>
    <div style="display:flex; flex-direction:column; margin-top:12px; flex-grow:1; width:720px;">${rows}</div>
    <div style="display:flex; font-family:'Oswald'; font-size:14px; letter-spacing:2px; color:${MUTED}; margin-top:10px;">${esc(card.footer.toUpperCase())}</div>
  </div>`;

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Oswald', data: oswald as ArrayBuffer, weight: 500, style: 'normal' },
      { name: 'Barlow', data: barlow as ArrayBuffer, weight: 400, style: 'normal' },
      { name: 'Barlow', data: barlowBold as ArrayBuffer, weight: 600, style: 'normal' },
    ],
  });
}
