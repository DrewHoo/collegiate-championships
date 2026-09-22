#!/usr/bin/env node
// Championship data fetcher.
//
// Pulls championship data from public sources and emits a JSON file
// the React app can import. New sources are added by appending to the
// SOURCES array below — no other code changes required.
//
// Usage:
//   node scripts/fetch-data.mjs
//
// Output:
//   src/championshipData.scraped.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'src', 'championshipData.scraped.json');

// --- Source definitions -----------------------------------------------------
//
// Each entry:
//   sport:     SPORTS key in championshipData.js
//   name:      human label (logs only)
//   url:       page to fetch
//   parser:    'csv' | 'wikipediaTable'
//   minYear:   earliest year to include (default 1972)
//   rename:    { 'Wikipedia Name': 'SCHOOLS-map name' } normalization
//   overrides: { year: 'School' | ['School','School'] | null } applied after
//              parsing, for the handful of cells the table encodes in a
//              shape the parser can't read (a tie written as two stacked
//              links in one cell) or shows against NCAA's own books.
//              null deletes the year — used for vacated titles Wikipedia
//              still prints a champion for.
//
// wikipediaTable-specific:
//   yearCol:   header text to locate the year column (default /year|season/i)
//   winnerCol: header text to locate the winner column (default /winner|champion/i)
//   tableMatch: optional regex (or string) matched against the table's caption
//               and its nearest preceding section heading. Only matching tables
//               are scraped — use it when a page carries a second champions
//               table that isn't the NCAA one (e.g. the AIAW era).
//
// csv-specific:
//   yearCol:   exact CSV header name for year
//   winnerCol: exact CSV header name for winner

// Shared rename map used by nearly every Wikipedia source to normalize
// Wikipedia's preferred team names to the keys used in SCHOOLS.
const WIKI_RENAMES = {
  'Connecticut': 'UConn',
  'Southern California': 'USC',
  'Miami (Florida)': 'Miami (FL)',
  'Miami': 'Miami (FL)',
  'Mississippi': 'Ole Miss',
  "Saint John's": "St. John's",
  "St. John's (NY)": "St. John's",
  'Brigham Young': 'BYU',
  'Nevada-Las Vegas': 'UNLV',
  'Massachusetts': 'UMass',
  'Minnesota-Duluth': 'Minnesota Duluth',
  'Minnesota–Duluth': 'Minnesota Duluth',
  'Loyola': 'Loyola Maryland',
  'Loyola (MD)': 'Loyola Maryland',
  'North Carolina State': 'NC State',
  // Wikipedia spells Hawaii with the ʻokina (U+02BB); SCHOOLS uses an
  // ASCII apostrophe.
  'Hawaiʻi': "Hawai'i",
  'Hawaii': "Hawai'i",
};

// Earliest championship year the grid covers. 1972 predates the 1973 split
// into Divisions I/II/III, so the oldest football and men's basketball rows
// are University Division champions — the direct ancestor of Division I.
const MIN_YEAR = 1972;

function wiki(extra = {}) {
  return {
    parser: 'wikipediaTable',
    minYear: MIN_YEAR,
    rename: { ...WIKI_RENAMES, ...(extra.rename || {}) },
    ...extra,
  };
}

const SOURCES = [
  {
    sport: 'mxc',
    name: "Men's Cross Country",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_cross_country_championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'football',
    name: 'Football (consensus AP/BCS/CFP)',
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_FBS_national_football_championship',
    parser: 'footballConsensus',
    minYear: MIN_YEAR,
    rename: WIKI_RENAMES,
  },
  {
    sport: 'mbb',
    name: "Men's Basketball",
    // Wikipedia renamed the column "Winning team" -> "Champion" (July 2026).
    url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_men%27s_basketball_champions',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wbb',
    name: "Women's Basketball",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Women%27s_Basketball_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'baseball',
    name: 'Baseball (College World Series)',
    url: 'https://en.wikipedia.org/wiki/College_World_Series',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'softball',
    name: "Softball (Women's College World Series)",
    url: 'https://en.wikipedia.org/wiki/Women%27s_College_World_Series',
    // The page lists the NCAA championship (1982–) and, below it, the AIAW
    // championship (1969–82). Without this the AIAW table wins the overlap
    // year and 1982 reads Texas A&M instead of UCLA.
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion', tableMatch: /^NCAA$/ }),
  },
  {
    sport: 'wvb',
    name: "Women's Volleyball",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_women%27s_volleyball_tournament',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'mih',
    name: "Men's Ice Hockey",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_ice_hockey_tournament',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winning team' }),
  },
  {
    sport: 'msoc',
    name: "Men's Soccer",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_soccer_tournament',
    // 1989 ended 0–0 after eight overtimes and was declared a shared title.
    // 1978 San Francisco was vacated by the NCAA Committee on Infractions
    // (falsified transcript; UPI 1980-11-18) — blanked to match the site's
    // vacated-title policy (mxc 1983, wgolf 1988). Wikipedia still prints
    // USF as champion; NCAA's D-I record book marks it vacated.
    ...wiki({
      yearCol: 'Year',
      winnerCol: 'Champion',
      overrides: { 1989: ['Santa Clara', 'Virginia'], 1978: null },
    }),
  },
  {
    sport: 'wsoc',
    name: "Women's Soccer",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_women%27s_soccer_tournament',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'mlax',
    name: "Men's Lacrosse",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Men%27s_Lacrosse_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'wlax',
    name: "Women's Lacrosse",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Women%27s_Lacrosse_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wfh',
    name: "Field Hockey",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Field_Hockey_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wih',
    name: "Women's Ice Hockey",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Women%27s_Ice_Hockey_Tournament',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wgym',
    name: "Women's Gymnastics",
    url: 'https://en.wikipedia.org/wiki/NCAA_Women%27s_Gymnastics_championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'mten',
    name: "Men's Tennis",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_tennis_championships',
    // The 1972 champion is "Trinity (TX)"; the winner cleaner strips the
    // parenthetical, which would collide with Trinity College (CT).
    // 1976 was a 21–21 points tie (NCAA record book: "Southern California,
    // UCLA"); Wikipedia's table keeps only USC.
    ...wiki({
      yearCol: 'Year',
      winnerCol: 'Champion',
      rename: { Trinity: 'Trinity (TX)' },
      overrides: { 1976: ['USC', 'UCLA'] },
    }),
  },
  {
    sport: 'wten',
    name: "Women's Tennis",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_women%27s_tennis_championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'mgolf',
    name: "Men's Golf",
    url: 'https://en.wikipedia.org/wiki/NCAA_Men%27s_Golf_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wgolf',
    name: "Women's Golf",
    url: 'https://en.wikipedia.org/wiki/NCAA_Women%27s_Golf_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'mswim',
    name: "Men's Swimming & Diving",
    url: 'https://en.wikipedia.org/wiki/NCAA_Men%27s_Swimming_and_Diving_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'wswim',
    name: "Women's Swimming & Diving",
    url: 'https://en.wikipedia.org/wiki/NCAA_Women%27s_Swimming_and_Diving_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wrestling',
    name: 'Wrestling',
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Wrestling_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'wxc',
    name: "Women's Cross Country",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_women%27s_cross_country_championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'mvb',
    name: "Men's Volleyball",
    url: 'https://en.wikipedia.org/wiki/NCAA_Men%27s_Volleyball_Championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'mwp',
    name: "Men's Water Polo",
    url: 'https://en.wikipedia.org/wiki/NCAA_men%27s_water_polo_championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'wwp',
    name: "Women's Water Polo",
    url: 'https://en.wikipedia.org/wiki/NCAA_women%27s_water_polo_championship',
    ...wiki({ yearCol: 'Year', winnerCol: 'National Champion' }),
  },
  {
    sport: 'mitf',
    name: "Men's Indoor Track & Field",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Men%27s_Indoor_Track_and_Field_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'witf',
    name: "Women's Indoor Track & Field",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Women%27s_Indoor_Track_and_Field_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'motf',
    name: "Men's Outdoor Track & Field",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Men%27s_Outdoor_Track_and_Field_Championships',
    // 2013 and 2025 ended in point ties, written as two stacked links in the
    // winner cell; the cell reader keeps only the first line. 1978 is USC's
    // vacated 59-point win: the title reverted to a 50–50 UCLA/UTEP tie
    // (NCAA record book + Track & Field News), which Wikipedia collapses.
    ...wiki({
      yearCol: 'Year',
      winnerCol: 'Winner',
      overrides: {
        1978: ['UCLA', 'UTEP'],
        2013: ['Florida', 'Texas A&M'],
        2025: ['USC', 'Texas A&M'],
      },
    }),
  },
  {
    sport: 'wotf',
    name: "Women's Outdoor Track & Field",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_Women%27s_Outdoor_Track_and_Field_Championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Winner' }),
  },
  {
    sport: 'wrow',
    name: "Women's Rowing",
    url: 'https://en.wikipedia.org/wiki/NCAA_Division_I_rowing_championship',
    // Two-tier header: Year/Site span both rows, Champion sits in the
    // sub-header row; rowspan expansion lines them up in one row for
    // locateHeader. Team champion column, not the per-boat results.
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
  {
    sport: 'mgym',
    name: "Men's Gymnastics",
    // National Collegiate championship (all divisions, one title) — noted
    // in the grid's methodology footnote alongside MVB/MWP/WWP/WGYM/WIH.
    url: 'https://en.wikipedia.org/wiki/NCAA_men%27s_gymnastics_championships',
    ...wiki({ yearCol: 'Year', winnerCol: 'Champion' }),
  },
];

// --- Parsers ----------------------------------------------------------------

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

function parseCsv(text, { yearCol, winnerCol, minYear = 0, rename = {} }) {
  const lines = text.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const yearIdx = header.indexOf(yearCol);
  const winIdx = header.indexOf(winnerCol);
  if (yearIdx === -1 || winIdx === -1) {
    throw new Error(`CSV missing columns: yearCol=${yearCol}, winnerCol=${winnerCol}`);
  }
  const out = {};
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const fields = parseCsvLine(line);
    const year = Number(fields[yearIdx]);
    let winner = fields[winIdx];
    if (!year || !winner) continue;
    if (year < minYear) continue;
    winner = rename[winner] || winner;
    out[year] = winner;
  }
  return out;
}

// Cleans a cell's visible text. Two Wikipedia patterns we need to handle:
//   1. "UCLA<br><i>Pac-10</i>" — team + metadata separated by <br>. Replace
//      <br> with \n and take the first line.
//   2. "FloridaOklahoma" — two team links concatenated with no separator
//      (co-champions). When the first <a>'s text is a strict prefix of the
//      cell text we prefer the link, which gives us the first team.
// For cells where the first link isn't the primary value ("1971 Details",
// where "Details" is a link), the link text won't be a prefix of the cell
// text and we fall back to the plain-text path.
function cellText($, el) {
  const $el = $(el).clone();
  $el.find('sup, .reference, style, script').remove();
  $el.find('br').replaceWith('\n');
  const firstLine = ($el.text().split('\n')[0] || '').replace(/\s+/g, ' ').trim();
  const clean = (s) =>
    s.replace(/\[[^\]]*\]/g, '').trim().replace(/^[*†‡§]+|[*†‡§]+$/g, '').trim();

  const firstLink = $el.find('a').first();
  if (firstLink.length) {
    const linkText = firstLink.text().replace(/\s+/g, ' ').trim();
    if (
      linkText &&
      firstLine.startsWith(linkText) &&
      firstLine.length > linkText.length
    ) {
      return clean(linkText);
    }
  }
  return clean(firstLine);
}

function normalizeHeader(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

// String matches anchor at the start of the header cell to avoid matching
// unrelated columns (e.g. looking for "Champion" should match "Champion(s)"
// but not "Singles Champion" or "Doubles Champions").
function findHeaderIdx(headers, target) {
  if (target instanceof RegExp) {
    return headers.findIndex((h) => target.test(h));
  }
  const t = normalizeHeader(target);
  let idx = headers.indexOf(t);
  if (idx !== -1) return idx;
  return headers.findIndex((h) => h === t || h.startsWith(t));
}

// Parse a <table> into a 2D array of cell objects, expanding rowspan/colspan
// so every logical row has the same number of columns. This is critical for
// Wikipedia champion tables that use rowspan to merge multi-year repeat
// winners (e.g. venue cells spanning several seasons).
function expandTable($, table) {
  const grid = [];
  const rows = $(table).find('tr').toArray();
  const occupied = []; // occupied[rowIdx] = Set<colIdx>
  for (let r = 0; r < rows.length; r++) {
    occupied[r] = occupied[r] || new Set();
    const row = [];
    const cells = $(rows[r]).find('th, td').toArray();
    let c = 0;
    for (const cell of cells) {
      while (occupied[r].has(c)) c++;
      const rowspan = parseInt($(cell).attr('rowspan') || '1', 10);
      const colspan = parseInt($(cell).attr('colspan') || '1', 10);
      const text = cellText($, cell);
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          occupied[rr] = occupied[rr] || new Set();
          occupied[rr].add(cc);
          grid[rr] = grid[rr] || [];
          grid[rr][cc] = text;
        }
      }
      c += colspan;
    }
  }
  return grid;
}

// Extract a year number from a cell value like "2019", "2018–19", "2020†",
// "1983*". Returns the later year for ranges (season-end convention), which
// matches the tournament year used throughout championshipData.js.
function extractYear(s) {
  if (!s) return null;
  const m = s.match(/(\d{4})(?:\s*[–\-]\s*(\d{2,4}))?/);
  if (!m) return null;
  const y1 = parseInt(m[1], 10);
  if (!m[2]) return y1;
  let y2 = parseInt(m[2], 10);
  if (y2 < 100) y2 = Math.floor(y1 / 100) * 100 + y2;
  if (y2 < y1) y2 += 100;
  return y2;
}

// Extract a clean school name from a winner cell. Strips trailing footnote
// markers, qualifiers like "(vacated)", and collapses "Team A / Team B" or
// "Team A & Team B" co-champions to the first team (rare; we note these).
function extractWinner(s) {
  if (!s) return null;
  // Drop explanatory cells that clearly aren't team names. Wikipedia writes
  // full sentences into the winner cell when a championship was cancelled.
  if (/cancel|pandemic|not held|covid|suspend/i.test(s)) return null;
  let out = s
    .replace(/\(.*?\)/g, '') // strip "(record)", "(#1)", trailing "(n)" counts
    .replace(/\s+\/\s+.*/, '') // co-champion "Team A / Team B" → "Team A"
    .replace(/\s+&\s+.*/, '') // co-champion "Team A & Team B"; keeps "Texas A&M"
    .replace(/\bvacated\b/i, '')
    .replace(/\bshared\b/i, '')
    .replace(/\bDetails\b/g, '')
    .replace(/^#\d+\s*/, '') // strip leading "#1 " seed
    .trim()
    .replace(/^[*†‡§]+|[*†‡§]+$/g, '')
    .trim();
  if (!out) return null;
  // Explicit placeholder values used in future/undecided rows.
  if (/^(tbd|tba|n\/?a|none|tie|--+|—+)$/i.test(out)) return null;
  // Real school names always contain letters.
  if (!/[A-Za-z]/.test(out)) return null;
  // Real school names are short. If we somehow kept a sentence, drop it.
  if (out.length > 35 || out.split(/\s+/).length > 5) return null;
  return out;
}

// Football-specific parser: the NCAA Division I FBS champions table has one
// row per (year, selector) pair, with Year using rowspan across multiple
// rows for years where selectors disagreed. After rowspan expansion we keep
// the highest-priority selector (CFP > BCS > AP > COACHES) per year, which
// mirrors how "consensus" national champions are usually reported.
function parseFootballConsensus(html, opts = {}) {
  const { minYear = MIN_YEAR, maxYear = new Date().getFullYear(), rename = {} } = opts;
  const $ = cheerio.load(html);
  const tables = $('table.wikitable').toArray();

  let chosen = null;
  for (const t of tables) {
    const grid = expandTable($, t);
    if (grid.length < 50) continue;
    const headers = (grid[0] || []).map((h) => normalizeHeader(h || ''));
    const seasonIdx = headers.findIndex((h) => /^season/.test(h));
    const champIdx = headers.findIndex((h) => /champion/.test(h));
    const selIdx = headers.findIndex((h) => /^selector/.test(h));
    if (seasonIdx !== -1 && champIdx !== -1 && selIdx !== -1) {
      chosen = { grid, seasonIdx, champIdx, selIdx };
      break;
    }
  }
  if (!chosen) throw new Error('no football champions table found');

  // Only the major selectors count; the table also lists a few dozen minor
  // ones (MGR, DeS, R(FACT)…) and honoring those would make almost every
  // season a four-way tie. UPI and USA Today are the coaches' poll under its
  // successive names.
  const priorityOf = (sel) => {
    if (/\bCFP\b/.test(sel)) return 4;
    if (/\bBCS\b/.test(sel)) return 3;
    if (/\bAP\b/.test(sel)) return 2;
    if (/\b(COACHES|UPI|USAT)\b/i.test(sel)) return 1;
    return 0;
  };

  // year -> Map(school -> best selector priority)
  const byYear = {};
  const { grid, seasonIdx, champIdx, selIdx } = chosen;
  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    const year = extractYear(row[seasonIdx] || '');
    const champ = extractWinner(row[champIdx] || '');
    const sel = row[selIdx] || '';
    if (!year || !champ) continue;
    if (year < minYear || year > maxYear) continue;
    const p = priorityOf(sel);
    if (p === 0) continue;
    const name = rename[champ] || champ;
    byYear[year] = byYear[year] || new Map();
    byYear[year].set(name, Math.max(byYear[year].get(name) ?? 0, p));
  }

  // Before the BCS there was no single arbiter, so a season where AP and the
  // coaches split produced two national champions (1973, 1974, 1978, 1990,
  // 1991, 1997) — as did 2003, when the AP kept USC and the BCS took LSU.
  // Those years emit both schools, highest-authority selector first; the app
  // renders an array as a shared title.
  const out = {};
  for (const y of Object.keys(byYear).sort()) {
    const winners = [...byYear[y].entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    out[y] = winners.length === 1 ? winners[0] : winners;
  }
  return out;
}

// Locate the header row in an expanded grid. Wikipedia champion tables
// frequently use a 2- or 3-row header (title row + category row + sub-header
// row), so we scan the first few rows and pick the one where both the year
// and winner columns are present.
function locateHeader(grid, yearCol, winnerCol, maxScan = 4) {
  for (let r = 0; r < Math.min(maxScan, grid.length); r++) {
    if (!grid[r]) continue;
    const headers = grid[r].map((h) => normalizeHeader(h || ''));
    const yi = findHeaderIdx(headers, yearCol);
    const wi = findHeaderIdx(headers, winnerCol);
    if (yi !== -1 && wi !== -1) return { headerRow: r, yi, wi };
  }
  return null;
}

// The two strings a `tableMatch` regex is tested against: the table's own
// <caption> and the nearest section heading above it. Wikipedia wraps headings
// in <div class="mw-heading">, and tables are sometimes nested a level or two
// deep, so we climb toward .mw-parser-output and scan backwards at each level
// until a heading turns up. Returned separately so an anchored pattern like
// /^NCAA$/ can pin one exact heading.
function tableContext($, table) {
  const caption = $(table).find('caption').first().text().replace(/\s+/g, ' ').trim();
  let heading = '';
  let node = $(table);
  while (node.length && !heading) {
    const prevHeading = node
      .prevAll()
      .toArray()
      .map((el) => $(el))
      .find(($el) => $el.is('h1,h2,h3,h4,h5,h6') || $el.find('h1,h2,h3,h4,h5,h6').length);
    if (prevHeading) {
      const $h = prevHeading.is('h1,h2,h3,h4,h5,h6')
        ? prevHeading
        : prevHeading.find('h1,h2,h3,h4,h5,h6').first();
      heading = $h.text().replace(/\[edit\]/gi, '').replace(/\s+/g, ' ').trim();
    }
    if (node.hasClass('mw-parser-output')) break;
    node = node.parent();
  }
  return [caption, heading];
}

function parseWikipediaTable(html, opts = {}) {
  const {
    yearCol = /^(year|season)/i,
    winnerCol = /^(winning team|winner|champion(?!ship))/i,
    minYear = MIN_YEAR,
    maxYear = new Date().getFullYear(),
    rename = {},
    tableMatch = null,
  } = opts;

  const $ = cheerio.load(html);
  const tables = $('table.wikitable').toArray();
  if (!tables.length) throw new Error('no wikitable found on page');

  const matcher =
    tableMatch == null
      ? null
      : tableMatch instanceof RegExp
        ? tableMatch
        : new RegExp(tableMatch, 'i');

  // Scrape every wikitable that has matching columns and merge the results.
  // Multi-era sport pages (tennis, golf, swimming) split champions across
  // several era tables; merging gives us the full history from one scrape.
  // Later matches override earlier ones, which is fine since each table
  // usually covers a disjoint year range. When `tableMatch` is set, tables
  // whose caption/heading don't match are skipped — the escape hatch for
  // pages that also carry a non-NCAA champions table.
  const out = {};
  let tablesMatched = 0;
  for (const t of tables) {
    const grid = expandTable($, t);
    if (!grid.length) continue;
    if (matcher && !tableContext($, t).some((s) => s && matcher.test(s))) continue;
    const header = locateHeader(grid, yearCol, winnerCol);
    if (!header) continue;
    tablesMatched++;
    const { headerRow, yi, wi } = header;
    for (let r = headerRow + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const year = extractYear(row[yi] || '');
      const winnerRaw = extractWinner(row[wi] || '');
      if (!year || !winnerRaw) continue;
      if (year < minYear || year > maxYear) continue;
      out[year] = rename[winnerRaw] || winnerRaw;
    }
  }
  if (!tablesMatched) {
    throw new Error(
      tableMatch
        ? `no wikitable matching ${tableMatch} with year/winner columns`
        : 'no wikitable with matching year/winner columns',
    );
  }
  return out;
}

// --- Main -------------------------------------------------------------------

function httpGet(url) {
  return execFileSync(
    'curl',
    [
      '-sSL',
      '--fail',
      '--max-time',
      '30',
      '-A',
      'cfb-all-time-records-scraper/1.0 (+github.com/anthropic)',
      url,
    ],
    { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 },
  );
}

async function main() {
  const results = {};
  for (const src of SOURCES) {
    process.stdout.write(`Fetching ${src.sport.padEnd(10)} (${src.name})... `);
    try {
      const text = httpGet(src.url);
      let data;
      if (src.parser === 'csv') {
        data = parseCsv(text, src);
      } else if (src.parser === 'wikipediaTable') {
        data = parseWikipediaTable(text, src);
      } else if (src.parser === 'footballConsensus') {
        data = parseFootballConsensus(text, src);
      } else {
        throw new Error(`unknown parser: ${src.parser}`);
      }
      for (const [year, value] of Object.entries(src.overrides || {})) {
        if (value === null) delete data[year];
        else data[year] = value;
      }
      results[src.sport] = data;
      const years = Object.keys(data).sort();
      console.log(`OK (${years.length} years, ${years[0]}–${years.at(-1)})`);
    } catch (err) {
      console.log(`FAIL (${err.message})`);
    }
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2) + '\n');
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`${Object.keys(results).length} sport(s) successfully scraped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
