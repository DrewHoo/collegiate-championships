#!/usr/bin/env node
// Compare scraped Wikipedia data against championshipData.js memory data.
// Text-scrapes championshipData.js directly since Vite's JSON import isn't
// Node-compatible (needs an import attribute).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scraped = JSON.parse(readFileSync(resolve('src/championshipData.scraped.json'), 'utf8'));
const src = readFileSync(resolve('src/championshipData.js'), 'utf8');

// Extract SPORTS list.
const sportsMatch = src.match(/export const SPORTS = \[([\s\S]*?)\];/);
const SPORTS = [...sportsMatch[1].matchAll(/key:\s*'(\w+)',\s*name:\s*["']([^"']+)["']/g)]
  .map((m) => ({ key: m[1], name: m[2] }));

// Extract each sport's CHAMPIONSHIPS[key]: {...} block.
function extractSport(key) {
  if (key === 'mxc') return scraped.mxc || {};
  const re = new RegExp(`\\b${key}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  const m = src.match(re);
  if (!m) return {};
  const body = m[1];
  const out = {};
  for (const entry of body.matchAll(/(\d{4}):\s*'([^']+)'/g)) {
    out[Number(entry[1])] = entry[2];
  }
  return out;
}

const CHAMPIONSHIPS = {};
for (const { key } of SPORTS) CHAMPIONSHIPS[key] = extractSport(key);

let totalDiffs = 0;
for (const { key, name } of SPORTS) {
  const mem = CHAMPIONSHIPS[key] || {};
  const sc = scraped[key] || {};
  const memYears = new Set(Object.keys(mem).map(Number));
  const scYears = new Set(Object.keys(sc).map(Number));
  const allYears = [...new Set([...memYears, ...scYears])].sort((a, b) => a - b);
  const diffs = [];
  const missingInScrape = [];
  const newInScrape = [];
  for (const y of allYears) {
    const m = mem[y];
    const s = sc[y];
    if (m && s) {
      if (m !== s) diffs.push(`  ${y}: mem="${m}"  ->  scraped="${s}"`);
    } else if (m && !s) {
      missingInScrape.push(`${y}:${m}`);
    } else if (!m && s) {
      newInScrape.push(`${y}:${s}`);
    }
  }
  if (diffs.length || missingInScrape.length || newInScrape.length) {
    console.log(`\n=== ${key} (${name}) — ${Object.keys(mem).length} mem, ${Object.keys(sc).length} scraped ===`);
    if (diffs.length) {
      console.log(`DIFFS (${diffs.length}):`);
      diffs.forEach((d) => console.log(d));
    }
    if (missingInScrape.length) console.log(`MISSING in scrape: ${missingInScrape.join(', ')}`);
    if (newInScrape.length)     console.log(`NEW in scrape:     ${newInScrape.join(', ')}`);
    totalDiffs += diffs.length;
  } else {
    console.log(`OK ${key}  (${Object.keys(sc).length} years, exact match)`);
  }
}
console.log(`\nTotal per-year mismatches: ${totalDiffs}`);
