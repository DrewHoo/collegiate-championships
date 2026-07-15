#!/usr/bin/env node
// Generate a JS snippet for the CHAMPIONSHIPS object in championshipData.js.
// Every sport is sourced from scraped[sportKey] at runtime — the generator
// only writes per-sport memory overrides for years that Wikipedia is missing.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scraped = JSON.parse(readFileSync(resolve('src/championshipData.scraped.json'), 'utf8'));
const src = readFileSync(resolve('src/championshipData.js'), 'utf8');

const sportsMatch = src.match(/export const SPORTS = \[([\s\S]*?)\];/);
const SPORTS = [...sportsMatch[1].matchAll(/key:\s*'(\w+)'/g)].map((m) => m[1]);

function extractSport(key) {
  if (key === 'mxc') return scraped.mxc || {};
  const re = new RegExp(`\\b${key}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  const m = src.match(re);
  if (!m) return {};
  const out = {};
  // Supports both single- and double-quoted team names.
  for (const entry of m[1].matchAll(/(\d{4}):\s*(?:'([^']+)'|"([^"]+)")/g)) {
    out[Number(entry[1])] = entry[2] || entry[3];
  }
  return out;
}

// For each sport, find years present in memory but missing from scraped —
// these are the "memory-only" overrides we need to preserve.
const overrides = {};
for (const key of SPORTS) {
  const mem = extractSport(key);
  const sc = scraped[key] || {};
  const extra = {};
  for (const y of Object.keys(mem)) {
    if (!sc[y] && mem[y]) extra[Number(y)] = mem[y];
  }
  if (Object.keys(extra).length) overrides[key] = extra;
}

console.log('Memory-only years per sport:');
for (const [k, v] of Object.entries(overrides)) {
  console.log(`  ${k}: ${Object.entries(v).map(([y, name]) => `${y}:${name}`).join(', ')}`);
}

// Emit the championships block
let out = 'export const CHAMPIONSHIPS = {\n';
for (const key of SPORTS) {
  const extra = overrides[key];
  if (extra && Object.keys(extra).length) {
    const entries = Object.entries(extra)
      .map(([y, name]) => `${y}: ${JSON.stringify(name)}`)
      .join(', ');
    out += `  ${key}: { ...(scraped.${key} || {}), ${entries} },\n`;
  } else {
    out += `  ${key}: scraped.${key} || {},\n`;
  }
}
out += '};\n';

writeFileSync(resolve('/tmp/champs_block.js'), out);
console.log('\nWrote /tmp/champs_block.js');
console.log(out);
