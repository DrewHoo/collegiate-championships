// The words a shared address carries: the sentence, the share text, the
// tab title, the description, the card's rows. Pure, so the page, the
// static card and the share worker say the same thing.
import * as C from './champs.js';

export const SITE = 'Collegiate Championships';
export const WORDMARK = 'Who has the most college championships?';

const int = (n) => n.toLocaleString('en-US');
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export const sentence = () => `Every NCAA Division I national champion since ${C.FIRST}, ${C.SPORTS.length} sports in one grid.`;

/** "Stanford has won 136 NCAA Division I national titles since 1972, 60 men's and 76 women's, the most of any school." */
export function schoolClaim(school) {
  const t = C.titles[school];
  if (!t) return `${school} has won no NCAA Division I national title since ${C.FIRST}.`;
  const r = C.rankOf(school);
  const place = r?.rank === 1 ? (r.tied ? ', tied for the most of any school' : ', the most of any school') : r ? `, ${r.tied ? 'tied ' : ''}${ordinal(r.rank)} of ${int(C.leaderboard.length)} schools` : '';
  return `${school} has won ${int(t.total)} NCAA Division I national title${t.total === 1 ? '' : 's'} since ${C.FIRST}, ${t.male} men's and ${t.female} women's${place}.`;
}

/** the share text: the open school's claim, the comparison, or the sentence */
export function shareText(q) {
  if (q.s.length === 0) return sentence();
  if (q.s.length === 1) return schoolClaim(q.s[0]);
  return `${list(q.s.map((s) => `${s} ${C.titles[s]?.total ?? 0}`))}: NCAA Division I national titles since ${C.FIRST}.`;
}

export function shareTitle(q) {
  if (q.s.length === 0) return WORDMARK;
  if (q.s.length === 1) {
    const t = C.titles[q.s[0]];
    return `${q.s[0]} national championships since ${C.FIRST}: ${t?.total ?? 0} NCAA titles in ${Object.keys(t?.sports ?? {}).length} sports`;
  }
  return `${q.s.join(' vs ')}: NCAA Division I championships since ${C.FIRST}`;
}

export function shareDescription(q) {
  const lead = C.leaderboard[0];
  if (q.s.length === 0) return `${sentence()} ${lead.school} leads with ${lead.total}; ${int(C.leaderboard.length)} schools have won at least one. Pick a school to trace every title it has won.`;
  if (q.s.length === 1) {
    const top = C.topSports(q.s[0]).map(([name, n]) => `${name} ${n}`).join(', ');
    return `${schoolClaim(q.s[0])}${top ? ` Most in ${top}.` : ''} Every title on a grid of ${C.SPORTS.length} sports and ${C.LAST - C.FIRST + 1} years.`;
  }
  return `${shareText(q)} Every title the schools have won, on a grid of ${C.SPORTS.length} sports since ${C.FIRST}.`;
}

/** the card's rows for a selection: one school's sports, or the schools compared */
export function cardRows(q) {
  if (q.s.length === 1) {
    const s = q.s[0];
    return C.topSports(s, 6).map(([name, n], i) => ({ rank: String(i + 1), name, span: C.titles[s].list.filter((x) => x.sport === name).map((x) => x.year).sort().join(' '), value: int(n), school: s }));
  }
  return q.s.map((s) => {
    const t = C.titles[s];
    const r = C.rankOf(s);
    return { rank: r ? `${r.tied ? 'T' : ''}${r.rank}` : '—', name: s, span: t ? `${t.male} men's · ${t.female} women's · ${Object.keys(t.sports).length} sports` : 'no titles', value: int(t?.total ?? 0), school: s };
  });
}
