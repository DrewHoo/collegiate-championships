// The grid's model: the sports in column order, every school's title count,
// the leaderboard, and the ?s= URL codec. Pure, shared by the page, the
// static card and the share worker.
import { SPORTS, SCHOOLS, CHAMPIONSHIPS, YEARS } from '../championshipData.js';

export { SPORTS, SCHOOLS, CHAMPIONSHIPS, YEARS };
export const FIRST = Math.min(...YEARS);
export const LAST = Math.max(...YEARS);
export const slugOf = (school) => school.replace(/\W+/g, '');

// Sports ordered alphabetically ignoring the "Men's "/"Women's " prefix so
// paired sports (Basketball, Soccer, Tennis…) sit next to each other.
const stripGender = (name) => name.replace(/^(Men's |Women's )/, '');
export const sortedSports = [...SPORTS].sort((a, b) => stripGender(a.name).localeCompare(stripGender(b.name)) || a.name.localeCompare(b.name));
/** newest year on top */
export const descendingYears = [...YEARS].sort((a, b) => b - a);

/** a year's champions in a sport, as a list (a shared title is two) */
export const champsOf = (sportKey, year) => {
  const raw = CHAMPIONSHIPS[sportKey]?.[year] ?? null;
  return raw == null ? [] : Array.isArray(raw) ? raw : [raw];
};

// Every school's titles: the total, the men's/women's split, per sport and
// per year. A shared title credits each co-champion with one.
export const titles = (() => {
  const counts = {};
  for (const sport of SPORTS) {
    for (const [year, value] of Object.entries(CHAMPIONSHIPS[sport.key] || {})) {
      if (!value) continue;
      for (const school of Array.isArray(value) ? value : [value]) {
        const e = counts[school] ?? (counts[school] = { total: 0, male: 0, female: 0, sports: {}, years: {}, list: [] });
        e.total += 1;
        if (sport.gender === '♂') e.male += 1;
        else if (sport.gender === '♀') e.female += 1;
        e.sports[sport.name] = (e.sports[sport.name] || 0) + 1;
        e.years[year] = (e.years[year] || 0) + 1;
        e.list.push({ sport: sport.name, year: Number(year) });
      }
    }
  }
  return counts;
})();

/** the schools with at least one title, alphabetical: what the finder lists */
export const schoolOptions = Object.keys(SCHOOLS).filter((s) => titles[s]).sort((a, b) => a.localeCompare(b));

/** most titles first, ties alphabetical, with competition ranks */
export const leaderboard = (() => {
  const rows = Object.entries(titles)
    .map(([school, t]) => ({ school, total: t.total, male: t.male, female: t.female, nSports: Object.keys(t.sports).length }))
    .sort((a, b) => b.total - a.total || a.school.localeCompare(b.school));
  let rank = 0;
  rows.forEach((r, i) => {
    if (i === 0 || r.total !== rows[i - 1].total) rank = i + 1;
    r.rank = rank;
    r.tied = (i > 0 && rows[i - 1].total === r.total) || (i + 1 < rows.length && rows[i + 1].total === r.total);
  });
  return rows;
})();
export const rankOf = (school) => leaderboard.find((r) => r.school === school) ?? null;

/** a school's sports, most titles first, as "Women's Tennis 9" */
export const topSports = (school, n = 3) =>
  Object.entries(titles[school]?.sports ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

/** ?s=Stanford&s=UCLA; the older ?a=, ?b= and ?school= still land */
export function parseUrl(search) {
  const p = new URLSearchParams(search);
  const raw = [...p.getAll('s'), p.get('a'), p.get('b'), p.get('school')];
  const s = [];
  for (const x of raw) if (x && SCHOOLS[x] && !s.includes(x)) s.push(x);
  return { s };
}
export function toUrl(q) {
  const p = new URLSearchParams();
  for (const x of q.s) p.append('s', x);
  const s = p.toString();
  return s ? `?${s}` : '';
}
export const isShared = (q) => q.s.length > 0;
