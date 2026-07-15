#!/usr/bin/env node
// Merges scraped championship data with existing championshipData.js memory
// data and reports:
//   - The reconciled data (JSON)
//   - Schools that appear in the reconciled data but are NOT in SCHOOLS
//
// Rule: scraped values win whenever both sides have a year; memory-only
// years are kept; scraped-only years are added.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scraped = JSON.parse(readFileSync(resolve('src/championshipData.scraped.json'), 'utf8'));
const src = readFileSync(resolve('src/championshipData.js'), 'utf8');

const sportsMatch = src.match(/export const SPORTS = \[([\s\S]*?)\];/);
const SPORTS = [...sportsMatch[1].matchAll(/key:\s*'(\w+)'/g)].map((m) => m[1]);

const schoolsMatch = src.match(/export const SCHOOLS = \{([\s\S]*?)\n\};/);
const SCHOOL_NAMES = new Set(
  [...schoolsMatch[1].matchAll(/(?:"([^"]+?)"|'([^']+?)'):\s*\{/g)].map(
    (m) => m[1] || m[2],
  ),
);

function extractSport(key) {
  if (key === 'mxc') return scraped.mxc || {};
  const re = new RegExp(`\\b${key}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  const m = src.match(re);
  if (!m) return {};
  const out = {};
  for (const entry of m[1].matchAll(/(\d{4}):\s*'([^']+)'/g)) {
    out[Number(entry[1])] = entry[2];
  }
  return out;
}

const merged = {};
const missingSchools = new Map(); // school -> [sport years]
for (const key of SPORTS) {
  const mem = extractSport(key);
  const sc = scraped[key] || {};
  const years = new Set([...Object.keys(mem), ...Object.keys(sc)].map(Number));
  const m = {};
  for (const y of [...years].sort((a, b) => a - b)) {
    const val = sc[y] ?? mem[y];
    if (!val) continue;
    m[y] = val;
    if (!SCHOOL_NAMES.has(val)) {
      if (!missingSchools.has(val)) missingSchools.set(val, []);
      missingSchools.get(val).push(`${key}/${y}`);
    }
  }
  merged[key] = m;
}

console.log('=== Missing schools (in reconciled data but not in SCHOOLS map) ===');
for (const [name, refs] of missingSchools) {
  console.log(`  "${name}"  [${refs.join(', ')}]`);
}

console.log('\n=== Per-sport year counts (merged) ===');
for (const key of SPORTS) {
  const count = Object.keys(merged[key]).length;
  const years = Object.keys(merged[key]).sort();
  console.log(`  ${key.padEnd(10)} ${count} years ${years[0]}-${years.at(-1)}`);
}

// Also emit the merged data as JSON to stdout for manual review/use
import { writeFileSync } from 'node:fs';
writeFileSync(resolve('/tmp/merged.json'), JSON.stringify(merged, null, 2));
console.log('\nWrote /tmp/merged.json');
