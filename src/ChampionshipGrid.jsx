import { useState, useMemo, useCallback, useRef, useEffect, Fragment, memo } from 'react';
import {
  SPORTS,
  SCHOOLS,
  CHAMPIONSHIPS,
  YEARS,
  getLogoUrl,
  getMonoLogoUrl,
} from './championshipData';
import { SchoolPicker } from './components/SchoolPicker.jsx';
import { useIsMobile } from './hooks/useIsMobile.js';
import { SITE, shareTitle as shareWords, shareText } from './lib/share.js';
import { SIBLINGS } from './lib/siblings.js';

const SITE_TITLE = 'Who has the most collegiate sports championships?';
const KOFI_URL = 'https://ko-fi.com/drewhooverdotcom';
const kofi = (from) => window.dhAnalytics?.track('kofi', { from });

// Sport header icons (Fluent Emoji High Contrast, MIT — see public/icons/).
// Applied as CSS masks so they wear the theme's ink color. They live in
// public/ rather than src/ so the path is the same string in the prerender
// (which loads the app through Vite's dev server) and in the built bundle;
// a hashed asset import would differ between the two and break hydration.
const sportIconUrl = (name) => `${import.meta.env.BASE_URL}icons/${name}.svg`;

// The icon bar's glyphs (College Football Streak King's Icons.jsx).
const ShareIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12.5" cy="3" r="2" /><circle cx="3.5" cy="8" r="2" /><circle cx="12.5" cy="13" r="2" />
    <path d="M5.3 7l5.4-3M5.3 9l5.4 3" />
  </svg>
);
const CoffeeIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5h9v3.5a3.5 3.5 0 0 1-3.5 3.5H6a3.5 3.5 0 0 1-3.5-3.5V6.5zM11.5 7.5h1a1.75 1.75 0 0 1 0 3.5h-1.2M5.5 1.8v2.4M8.5 1.8v2.4" /></svg>
);

// Default cell size (overridden on mobile via a CSS min() + viewport calc).
const CELL = 32;
const YEAR_W = 48;
const HDR_H = 56;

// Sanitize a school name into a className suffix. Strips everything that
// isn't a word character so names like "Ohio State" → "active-OhioState".
const activeClass = (school) => 'active-' + school.replace(/\W+/g, '');

// Build a static stylesheet with one rule per school that has titles. The
// layout wrapper toggles `has-active` + per-school `active-<Name>` classes
// on hover, so the expensive style invalidation that used to happen every
// hover (swapping the <style> tag contents) is replaced with a cheap
// className change against pre-parsed rules.
//
// The board is monochrome by default (baked white stamps); an active
// school's marks crossfade to the full-color logo (--sel: 1) while everyone
// else's cells recede via opacity. Color itself is the highlight — no
// rings, no glow, no cell background.
const SCHOOL_HIGHLIGHT_CSS = (() => {
  const present = new Set();
  for (const sport of SPORTS) {
    const data = CHAMPIONSHIPS[sport.key] || {};
    for (const value of Object.values(data)) {
      if (!value) continue;
      const schools = Array.isArray(value) ? value : [value];
      for (const s of schools) present.add(s);
    }
  }
  const esc = (s) => s.replace(/["\\]/g, '\\$&');
  // Cells rest at the recessive grey (see .cg-cell opacity) whether or not
  // anything is active; these rules only lift the active school's cells.
  let css = '';
  for (const s of present) {
    const e = esc(s);
    const c = activeClass(s);
    css += `.cg-active-scope.${c} .cg-cell[data-school="${e}"],.cg-active-scope.${c} .cg-cell[data-school-2="${e}"]{opacity:1;}\n`;
    // --sel crossfades the white stamp out and the color logo in (inherited
    // by both <img>s of the mark). Shared cells carry both schools, so only
    // the active school's half flips.
    css += `.cg-active-scope.${c} .cg-cell[data-school="${e}"]:not(.cg-cell--shared),.cg-active-scope.${c} .cg-cell--shared[data-school="${e}"] .cg-half--a,.cg-active-scope.${c} .cg-cell--shared[data-school-2="${e}"] .cg-half--b{--sel:1;}\n`;
    css += `.cg-active-scope.${c} .cg-lb-row[data-school="${e}"]{color:var(--bright);}\n`;
    css += `.cg-active-scope.${c} .cg-lb-row[data-school="${e}"] .cg-lb-count{color:var(--accent);}\n`;
  }
  return css;
})();

// A school's mark: the baked white stamp, with the full-color logo stacked
// on top at opacity 0. The per-school --sel rule crossfades between them.
// The hidden text fallback flips on only if the stamp 404s.
function SchoolMark({ school, onError }) {
  const info = SCHOOLS[school];
  const mono = getMonoLogoUrl(school);
  const color = getLogoUrl(school);
  const invert = info?.invertLogo ? ' cg-logo--invert' : '';
  const fallback = (visible) => (
    <div
      className="cg-fallback"
      style={{
        display: visible ? 'flex' : 'none',
        background: info?.color || '#555',
      }}
    >
      {info?.abbr || school.slice(0, 3).toUpperCase()}
    </div>
  );
  if (!mono && !color) return fallback(true);
  return (
    <>
      <span className="cg-mark">
        {mono ? (
          <img
            src={mono}
            alt={school}
            loading="lazy"
            className="cg-logo cg-logo--mono"
            onError={onError}
          />
        ) : (
          <img
            src={color}
            alt={school}
            loading="lazy"
            className={'cg-logo cg-logo--auto' + invert}
            onError={onError}
          />
        )}
        {mono && color && (
          <img
            src={color}
            alt=""
            loading="lazy"
            className={'cg-logo cg-logo--color' + invert}
          />
        )}
      </span>
      {fallback(false)}
    </>
  );
}

// Read ?s=... (repeatable) after mount so shared links land on the right
// selection. Legacy ?a=/?b=/?school= are still honored for older links.
// Not read during render: the page is prerendered at build and hydrated,
// so the first render must not depend on the URL.
const selectionFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const raw = [
    ...params.getAll('s'),
    params.get('a'),
    params.get('b'),
    params.get('school'),
  ];
  const seen = new Set();
  const out = [];
  for (const s of raw) {
    if (s && SCHOOLS[s] && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
};

export default function ChampionshipGrid() {
  const [highlighted, setHighlighted] = useState(null);
  const [selection, setSelection] = useState([]);
  const [copied, setCopied] = useState(false);
  const scopeRef = useRef(null);
  const tipRef = useRef(null);

  // Apply the URL's selection once, right after hydration.
  const urlApplied = useRef(false);
  useEffect(() => {
    const fromUrl = selectionFromUrl();
    if (fromUrl.length) setSelection(fromUrl);
    urlApplied.current = true;
  }, []);

  // Keep ?s= in sync with the selection and drop legacy params. Skipped until
  // the URL has been read, so the first render's empty selection can't wipe
  // the ?s= a shared link arrived with.
  useEffect(() => {
    if (!urlApplied.current) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('school');
    url.searchParams.delete('a');
    url.searchParams.delete('b');
    url.searchParams.delete('s');
    for (const s of selection) url.searchParams.append('s', s);
    window.history.replaceState(null, '', url);
    // the tab reads as the picks do (the share worker words a shared link the same way)
    document.title = selection.length ? `${shareWords({ s: selection })} · Collegiate Championships` : SITE_TITLE;
  }, [selection]);

  const activeSchools = useMemo(() => {
    if (!highlighted) return selection;
    if (selection.includes(highlighted)) return selection;
    return [...selection, highlighted];
  }, [selection, highlighted]);

  // Sports ordered alphabetically ignoring the "Men's "/"Women's " prefix so
  // paired sports (Basketball, Soccer, Tennis…) sit next to each other.
  const sortedSports = useMemo(() => {
    const stripGender = (name) => name.replace(/^(Men's |Women's )/, '');
    return [...SPORTS].sort((a, b) => {
      const cmp = stripGender(a.name).localeCompare(stripGender(b.name));
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
    });
  }, []);

  // Years in descending order (newest at the top of the grid).
  const descendingYears = useMemo(() => [...YEARS].sort((a, b) => b - a), []);
  const yearRange = useMemo(
    () => `${Math.min(...YEARS)}–${Math.max(...YEARS)}`,
    [],
  );
  const FIRST = Math.min(...YEARS);

  // Count titles per school across all sports shown, broken down by the
  // sport's gender, plus per-sport and per-year tallies for the sidebar's
  // summary line and year sparkline. Shared titles (array values) credit
  // each co-champion with one title.
  const schoolTitles = useMemo(() => {
    const counts = {};
    for (const sport of SPORTS) {
      const data = CHAMPIONSHIPS[sport.key] || {};
      const gender = sport.gender;
      for (const [year, value] of Object.entries(data)) {
        if (!value) continue;
        const schools = Array.isArray(value) ? value : [value];
        for (const school of schools) {
          const entry =
            counts[school] ||
            (counts[school] = {
              total: 0,
              male: 0,
              female: 0,
              sports: {},
              years: {},
            });
          entry.total += 1;
          if (gender === '♂') entry.male += 1;
          else if (gender === '♀') entry.female += 1;
          entry.sports[sport.name] = (entry.sports[sport.name] || 0) + 1;
          entry.years[year] = (entry.years[year] || 0) + 1;
        }
      }
    }
    return counts;
  }, []);

  // Picker option list — only schools with at least one title, sorted
  // alphabetically. Schools with zero titles can't be meaningfully compared.
  const schoolOptions = useMemo(
    () =>
      Object.keys(SCHOOLS)
        .filter((s) => schoolTitles[s])
        .sort((a, b) => a.localeCompare(b)),
    [schoolTitles],
  );

  // the finder's rows: every school with a title, its mark and its count
  const finderItems = useMemo(
    () => schoolOptions.map((s) => ({ key: s, name: s, mark: getLogoUrl(s), sub: String(schoolTitles[s]?.total ?? 0) })),
    [schoolOptions, schoolTitles],
  );
  const addSchool = useCallback((school) => {
    setSelection((prev) => (prev.includes(school) ? prev : [...prev, school]));
  }, []);
  const isMobile = useIsMobile();

  // Hover intent: a school only highlights after the cursor has rested on
  // its mark for 100ms, so sweeping across the board reads as a calm
  // neutral grid instead of a strobe. Entering a different school's cell
  // drops the previous highlight immediately and restarts the dwell timer.
  const hoverTimer = useRef(null);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const onEnter = useCallback((school) => {
    clearTimeout(hoverTimer.current);
    setHighlighted((prev) => (prev === school ? prev : null));
    hoverTimer.current = setTimeout(() => setHighlighted(school), 100);
  }, []);

  const onLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHighlighted(null);
  }, []);

  const toggleSchool = useCallback((school) => {
    clearTimeout(hoverTimer.current);
    setSelection((prev) =>
      prev.includes(school) ? prev.filter((s) => s !== school) : [...prev, school],
    );
    setHighlighted(null);
  }, []);

  const onClick = useCallback(
    (school, e) => {
      e.stopPropagation();
      toggleSchool(school);
    },
    [toggleSchool],
  );

  const clearSelection = useCallback(() => {
    setSelection([]);
    setHighlighted(null);
  }, []);

  const handleImgError = useCallback((e) => {
    // Hide the whole mark (stamp + color logo) so the text fallback shows
    const mark = e.target.closest('.cg-mark');
    if (!mark) return;
    mark.style.display = 'none';
    const fallback = mark.nextElementSibling;
    if (fallback) fallback.style.display = 'flex';
  }, []);

  // The share: the native sheet where there is one, else copy "text url" and
  // flash copied (Streak King's useShare). The text is the page's sentence
  // for the picks, the same words the share worker writes into a link's head.
  const share = useCallback(() => {
    const text = shareText({ s: selection });
    const url = window.location.href;
    window.dhAnalytics?.track('share', { from: 'icons', s: selection.join(',') || null });
    try {
      if (navigator.share) {
        navigator.share({ title: SITE, text, url }).catch(() => {});
        return;
      }
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    } catch {
      // Clipboard API can fail on http: or inside some iframes; nothing to show.
    }
  }, [selection]);

  // Apply highlighting classes directly to the wrapper around the grid and
  // sidebar so hover state never re-renders the memoized GridContent or
  // Leaderboard. The CSS rules themselves are static, so className changes
  // don't cause a CSS reparse.
  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    const base = 'cg-layout cg-active-scope';
    el.className =
      activeSchools.length === 0
        ? base
        : `${base} has-active ${activeSchools.map(activeClass).join(' ')}`;
  }, [activeSchools]);

  // Sport-name tooltip. A single fixed-position element positioned on hover
  // via delegation, instead of a per-header ::after — the header sits inside
  // the grid's `overflow-x: clip`, so a ::after tooltip on any column within
  // half its width of either edge gets cut off. Fixed positioning escapes
  // the clip, and we clamp to the viewport so it's never off-screen.
  useEffect(() => {
    const scope = scopeRef.current;
    const tip = tipRef.current;
    if (!scope || !tip) return;
    const show = (hdr) => {
      tip.textContent = hdr.dataset.name;
      const r = hdr.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const left = Math.max(
        8,
        Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 8),
      );
      tip.style.left = `${left}px`;
      tip.style.top = `${r.bottom + 4}px`;
      tip.style.opacity = '1';
    };
    const hide = () => {
      tip.style.opacity = '0';
    };
    const onOver = (e) => {
      const hdr = e.target.closest('.cg-sport-hdr');
      if (hdr) show(hdr);
    };
    const onOut = (e) => {
      const hdr = e.target.closest('.cg-sport-hdr');
      if (hdr && !hdr.contains(e.relatedTarget)) hide();
    };
    scope.addEventListener('mouseover', onOver);
    scope.addEventListener('mouseout', onOut);
    return () => {
      scope.removeEventListener('mouseover', onOver);
      scope.removeEventListener('mouseout', onOut);
    };
  }, []);

  // Leaderboard rows: every school with at least one title, most titles
  // first, ties alphabetical. Each row carries the summary-line stats and
  // a tooltip listing the school's top sports.
  const leaderboard = useMemo(
    () =>
      Object.entries(schoolTitles)
        .map(([school, t]) => {
          const topSports = Object.entries(t.sports)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, n]) => `${name} ${n}`)
            .join(', ');
          return {
            school,
            total: t.total,
            male: t.male,
            female: t.female,
            nSports: Object.keys(t.sports).length,
            years: t.years,
            tooltip: `${school} — ${topSports}`,
          };
        })
        .sort((a, b) => b.total - a.total || a.school.localeCompare(b.school)),
    [schoolTitles],
  );

  return (
    <div className="cg-page" onClick={clearSelection}>
      {/* dangerouslySetInnerHTML, not a text child: React 18's server renderer
          HTML-escapes text inside <style>, which the browser doesn't decode
          there, so the prerendered CSS would carry &quot; and &#x27; and
          hydration would report a text mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <style dangerouslySetInnerHTML={{ __html: SCHOOL_HIGHLIGHT_CSS }} />
      <div className="cg-tip" ref={tipRef} aria-hidden="true" />

      {/* Header */}
      <header className="cg-header">
        <h1>NCAA Division I Championships</h1>
        <p className="cg-sub">
          {yearRange} &middot; {SPORTS.length} sports
        </p>
      </header>

      {/* The picks, as chips in a sentence, and a dashed + that opens the
          finder (a dropdown; a bottom sheet on phones). stopPropagation: the
          finder's menu is a React child of this element even though it's
          portaled, so a pick must not bubble to the page's clear. */}
      <p className="cg-sentence" onClick={(e) => e.stopPropagation()}>
        Pick a school to trace its titles:
        {selection.map((s) => {
          const info = SCHOOLS[s];
          const logo = getLogoUrl(s);
          const t = schoolTitles[s];
          return (
            <span key={s} className="sel">
              {logo ? (
                <img src={logo} alt="" className={'sel-mark' + (info?.invertLogo ? ' cg-logo--invert' : '')} />
              ) : (
                <span className="sel-mark sel-mark--text" style={{ background: info?.color || '#555' }}>{info?.abbr || s.slice(0, 3)}</span>
              )}
              <span className="sel-name">{s}</span>
              <b className="sel-n">{t?.total ?? 0}</b>
              {t && (t.male > 0 || t.female > 0) && (
                <span className="sel-bd" aria-label="Breakdown by sport gender">{t.male}♂ {t.female}♀</span>
              )}
              <button type="button" className="sel-x" onClick={() => toggleSchool(s)} aria-label={`Remove ${s}`}>×</button>
            </span>
          );
        })}
        <SchoolPicker items={finderItems} onPick={addSchool} isMobile={isMobile} placeholder="Find a school" title="School" none="No school with a title matches.">
          <button type="button" className="addbtn" aria-label="Add a school">+</button>
        </SchoolPicker>
      </p>

      {/* The icon bar: Ko-fi and share. stopPropagation so a click doesn't clear the picks. */}
      <div className="cg-icons" onClick={(e) => e.stopPropagation()}>
        <a className="ico" href={KOFI_URL} onClick={() => kofi('icons')} aria-label="Buy me a coffee"><CoffeeIcon /></a>
        <button type="button" className="ico" onClick={share} aria-label="Share"><ShareIcon /></button>
        {copied && <span className="toast">copied</span>}
      </div>

      {/* Grid + leaderboard — both memoized so hover state changes never
          re-render them. The active-school className is applied imperatively
          via scopeRef above, driving pre-parsed rules in
          SCHOOL_HIGHLIGHT_CSS. */}
      <div ref={scopeRef} className="cg-layout cg-active-scope">
        <GridContent
          sortedSports={sortedSports}
          descendingYears={descendingYears}
          onEnter={onEnter}
          onLeave={onLeave}
          onClick={onClick}
          handleImgError={handleImgError}
        />
        <Leaderboard
          rows={leaderboard}
          onEnter={onEnter}
          onLeave={onLeave}
          onToggle={toggleSchool}
        />
      </div>

      <div className="cg-readnext">
        <h2>What to read next</h2>
        {SIBLINGS.map((s) => (
          <p key={s.url}>
            <a href={s.url}>{s.name}</a> — {s.words}
          </p>
        ))}
      </div>

      <div className="cg-notes">
        <p>
          If a count from this page ends up in your article, broadcast, podcast or thread, please cite it:
          name the site and link to the page; the url encodes the schools.
        </p>
        <p>
          The site is free and serves no ads. If you enjoyed using it, consider{' '}
          <a href={KOFI_URL} onClick={() => kofi('notes')}>buying me some server compute</a>.
        </p>
      </div>

      <section id="method" className="cg-method" aria-label="Method">
        <h2>Method</h2>
        <p>
          The grid is every NCAA Division I national champion from {yearRange}, one column per sport, one
          row per year, {SPORTS.length} sports. Why these {SPORTS.length}? Each clears at least two of three
          lenses: sponsorship (how many Division&nbsp;I schools field a team), popularity (attendance and
          viewership), and Olympic relevance; or it is the gender counterpart of a sport that does. The
          champions come from each sport&rsquo;s championship page on{' '}
          <a href="https://en.wikipedia.org/wiki/NCAA_Division_I">Wikipedia</a> (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). The sections below
          say where the data comes from, what counts as a championship, what the words mean, and why a
          school&rsquo;s own count can differ.
        </p>

        <details>
          <summary>Where the data comes from</summary>
          <p>
            Each sport&rsquo;s championship page on Wikipedia carries a table of champions by year; a script
            in the repository reads those tables and writes the data the grid draws. Where a page also lists
            a championship that is not the NCAA&rsquo;s (softball&rsquo;s AIAW era, 1969&ndash;82), only the
            NCAA table is read. Football&rsquo;s page lists one row per year per selector; the script keeps
            one champion per year, preferring the CFP, then the BCS, then the AP poll, then the coaches,
            and keeps both schools for the seasons those selectors split. The refresh is by hand: the script
            runs again when a season&rsquo;s champions are final, the diff is read, and the data is committed.
          </p>
        </details>

        <details>
          <summary>What counts as a championship</summary>
          <p>
            A cell is the NCAA Division I national champion in that sport that year. Football uses the AP
            poll champion before the BCS and the BCS or CFP champion since; the seasons the selectors split
            (1973, 1974, 1978, 1990, 1991, 1997 and 2003) show both schools. Before the 1973 split into
            divisions, the football and basketball champions are University Division champions. Men&rsquo;s
            volleyball and gymnastics, both water polos, and women&rsquo;s gymnastics, ice hockey and
            wrestling are National Collegiate titles, decided across all divisions. A shared title (two
            marks in one cell) credits each co-champion with one. A dash in 2020 is a season canceled for
            COVID-19.
          </p>
          <p>
            A column begins when the NCAA first sponsored the championship. The women&rsquo;s columns begin
            in 1981&ndash;82 (rowing 1997, ice hockey and water polo 2001, wrestling 2026). There is no
            men&rsquo;s rowing column because the NCAA has never sponsored one: the IRA has run that national
            championship since 1895, older than the NCAA itself. Women&rsquo;s bowling, fencing, rifle and
            skiing are absent because each clears one lens at most, and the last three are coed
            championships that don&rsquo;t fit the grid&rsquo;s men&rsquo;s and women&rsquo;s columns.
          </p>
        </details>

        <details>
          <summary>What the words mean</summary>
          <p>
            A school&rsquo;s <b>titles</b> are its cells on the grid: the championships it has won across the{' '}
            {SPORTS.length} sports since {FIRST}. The <b>men&rsquo;s</b> and <b>women&rsquo;s</b> split
            follows the sport&rsquo;s column. <b>Most titles</b> ranks every school with at least one, most
            first, ties alphabetical; the rank in a school&rsquo;s share text (&ldquo;tied 3rd of 134
            schools&rdquo;) is a competition rank. A school&rsquo;s share text names the sports it has won
            most in. Pick a school and its marks go to
            color while the rest of the board recedes; the address carries the picks (?s=School, repeatable),
            so a link opens the same view.
          </p>
        </details>

        <details>
          <summary>Where a published number differs, and why</summary>
          <p>
            A school&rsquo;s own count of national championships usually runs higher than its count here, for
            four reasons. The grid begins in {FIRST}, so titles before that are out. The grid has{' '}
            {SPORTS.length} sports, so titles in fencing, rifle, skiing, bowling and the sports the NCAA
            doesn&rsquo;t sponsor are out. Only NCAA titles count, so AIAW championships, IRA rowing and
            football titles from any selector the grid doesn&rsquo;t use are out. And a shared football
            title counts once for each school here, where a school&rsquo;s own books may claim it alone.
            Where Wikipedia&rsquo;s table and a school&rsquo;s page disagree, the grid shows Wikipedia&rsquo;s.
          </p>
        </details>
      </section>

      <footer className="cg-footer">
        <p>
          Data from each sport&rsquo;s championship page on{' '}
          <a href="https://en.wikipedia.org/wiki/NCAA_Division_I">Wikipedia</a> (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>).
        </p>
        <p>
          <a href="https://drewhoover.com/">drewhoover.com</a> ·{' '}
          <a href="https://github.com/DrewHoo/collegiate-championships">source</a> ·{' '}
          <a href={KOFI_URL} onClick={() => kofi('footer')}>buy me a coffee</a>
        </p>
      </footer>
    </div>
  );
}

// Memoized grid body. All its props are stable (module-level data + useCallback
// handlers that read `selection` via a ref), so React.memo's default shallow
// comparison skips reconciliation on every hover-state change in the parent.
const GridContent = memo(function GridContent({
  sortedSports,
  descendingYears,
  onEnter,
  onLeave,
  onClick,
  handleImgError,
}) {
  return (
    <div className="cg-scroll">
      <div
        className="cg-grid"
        onMouseLeave={onLeave}
        style={{
          '--sport-count': sortedSports.length,
          '--year-count': descendingYears.length,
          '--cell-w-default': `${CELL}px`,
          '--year-w-default': `${YEAR_W}px`,
          '--header-h-default': `${HDR_H}px`,
        }}
      >
        <div className="cg-corner" />

        {sortedSports.map((sport) => (
          <div
            key={sport.key}
            className="cg-sport-hdr"
            data-name={sport.name}
            aria-label={sport.name}
          >
            <span
              className="cg-sport-icon"
              aria-hidden="true"
              style={{ '--icon': `url(${sportIconUrl(sport.icon)})` }}
            />
            {sport.tag && (
              <span className="cg-sport-tag" aria-hidden="true">
                {sport.tag}
              </span>
            )}
            {sport.gender && (
              <span className="cg-sport-gender" aria-hidden="true">
                {sport.gender}
              </span>
            )}
          </div>
        ))}

        {descendingYears.map((year) => {
          const isDecade = year % 10 === 0;
          return (
            <Fragment key={year}>
              <div className={`cg-year ${isDecade ? 'cg-year--decade' : ''}`}>
                {year}
              </div>
              {sortedSports.map((sport) => {
                const raw = CHAMPIONSHIPS[sport.key]?.[year] ?? null;
                const champs = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
                const isShared = champs.length > 1;
                const primary = champs[0] ?? null;
                const secondary = champs[1] ?? null;

                let cls = 'cg-cell';
                if (champs.length === 0) cls += ' cg-cell--empty';
                if (isDecade) cls += ' cg-cell--decade';
                if (isShared) cls += ' cg-cell--shared';

                const titleText =
                  champs.length === 0
                    ? `${year} ${sport.name}: No champion`
                    : `${year} ${sport.name}: ${champs.join(' & ')}${isShared ? ' (shared)' : ''}`;

                return (
                  <div
                    key={sport.key}
                    className={cls}
                    data-school={primary || undefined}
                    data-school-2={secondary || undefined}
                    onMouseEnter={
                      !isShared && primary ? () => onEnter(primary) : undefined
                    }
                    onClick={
                      !isShared && primary ? (e) => onClick(primary, e) : undefined
                    }
                    title={titleText}
                  >
                    {isShared
                      ? champs.map((co, i) => (
                          <div
                            key={co}
                            className={`cg-half cg-half--${i === 0 ? 'a' : 'b'}`}
                            onMouseEnter={() => onEnter(co)}
                            onClick={(e) => onClick(co, e)}
                          >
                            <SchoolMark school={co} onError={handleImgError} />
                          </div>
                        ))
                      : primary && (
                          <SchoolMark
                            school={primary}
                            onError={handleImgError}
                          />
                        )}
                    {champs.length === 0 &&
                      year === 2020 &&
                      CHAMPIONSHIPS[sport.key]?.[2019] &&
                      !CHAMPIONSHIPS[sport.key]?.[2020] && (
                        <div className="cg-covid" title="Canceled (COVID-19)">
                          &mdash;
                        </div>
                      )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

// Tiny per-school timeline: one tick per year with a title, tick height by
// how many titles that year. Stretched via preserveAspectRatio so the
// full YEARS span always fills the strip; fill follows the row's text
// color so it brightens with the row.
const YEARS_ASC = [...YEARS].sort((a, b) => a - b);
function YearSpark({ years }) {
  return (
    <svg
      className="cg-lb-spark"
      viewBox={`0 0 ${YEARS_ASC.length} 8`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {YEARS_ASC.map((y, i) => {
        const c = years[y];
        if (!c) return null;
        const h = c === 1 ? 3 : c === 2 ? 5.5 : 8;
        return <rect key={y} x={i + 0.1} y={8 - h} width={0.8} height={h} />;
      })}
    </svg>
  );
}

// Ranked list of schools by total titles. Rows share the grid's hover/select
// mechanics: hovering previews the school in color on the board, clicking
// toggles it into the selection. Logos stay in full color here — the row is
// a legend entry, not a board mark. Active-row text/count styling comes from
// SCHOOL_HIGHLIGHT_CSS via data-school, so the memo never breaks on hover.
const Leaderboard = memo(function Leaderboard({ rows, onEnter, onLeave, onToggle }) {
  return (
    <aside className="cg-lb" onClick={(e) => e.stopPropagation()}>
      <div className="cg-lb-title">Most titles</div>
      <div className="cg-lb-list">
        {rows.map(({ school, total, male, female, nSports, years, tooltip }) => {
          const info = SCHOOLS[school];
          const logo = getLogoUrl(school);
          return (
            <button
              type="button"
              key={school}
              className="cg-lb-row"
              data-school={school}
              title={tooltip}
              onMouseEnter={() => onEnter(school)}
              onMouseLeave={onLeave}
              onClick={() => onToggle(school)}
            >
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  loading="lazy"
                  className={
                    'cg-lb-logo' + (info?.invertLogo ? ' cg-logo--invert' : '')
                  }
                />
              ) : (
                <span
                  className="cg-lb-logo cg-lb-logo--text"
                  style={{ background: info?.color || '#555' }}
                >
                  {info?.abbr || school.slice(0, 3)}
                </span>
              )}
              <span className="cg-lb-name">{school}</span>
              <span
                className="cg-lb-bd"
                aria-label={`${nSports} ${nSports === 1 ? 'sport' : 'sports'}, men's: ${male}, women's: ${female}`}
              >
                {nSports}
                {' '}sp · ♂{male}
                {' '}♀{female}
              </span>
              <YearSpark years={years} />
              <span className="cg-lb-count">{total}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
});

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Cinder track before sunrise: warm charcoal-rose surfaces, one muted
   salmon accent, athletic-program type (Oswald display, Barlow text,
   Barlow Condensed numerals). */
:root {
  --bg:      #2e2a2c;
  --surface: #363134;
  --border:  rgba(255,255,255,0.08);
  --text:    #e3dedd;
  --muted:   #a29699;
  --bright:  #eae4e2;
  --accent:  #e2977e;
  /* Logo treatment. Marks render as baked white stamps by default and
     crossfade to the color logo when their school is active (--sel: 1,
     set per school in SCHOOL_HIGHLIGHT_CSS). --fx-base carries per-logo
     fixes (the invert for dark-only logos) so it survives the swap. */
  --fx-base: brightness(1);
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Page */
.cg-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 48px;
}

/* Header */
.cg-header {
  text-align: center;
  margin-bottom: 12px;
}
.cg-nav {
  display: inline-block;
  font-size: 11px;
  color: var(--muted);
  text-decoration: none;
  margin-bottom: 10px;
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  letter-spacing: 0.03em;
  transition: color 0.15s, border-color 0.15s;
}
.cg-nav:hover {
  color: var(--bright);
  border-color: rgba(255,255,255,0.25);
}
.cg-header h1 {
  font-family: Georgia, 'Source Serif 4', 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--bright);
  margin-top: 6px;
}
.cg-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

/* The picks: a sentence of chips, and a dashed + that opens the finder.
   Dashed means "something can change here". */
.cg-sentence {
  max-width: 720px;
  margin: 2px 0 12px;
  text-align: center;
  font-size: 15px;
  line-height: 1.9;
  color: var(--muted);
}
.addbtn {
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
  width: 28px;
  height: 28px;
  border: 1px dashed var(--muted);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-family: 'Barlow', sans-serif;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}
.addbtn:hover, .addbtn[data-state='open'] { color: var(--bright); border-color: var(--bright); }
.sel {
  display: inline-flex;
  vertical-align: middle;
  align-items: center;
  gap: 6px;
  margin: 2px 2px 2px 6px;
  padding: 3px 4px 3px 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--bright);
}
.sel-mark { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; filter: var(--fx-base); }
.sel-mark--text { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; font-size: 8px; color: #fff; }
.sel-n { font-family: 'Barlow Condensed', sans-serif; font-weight: 500; font-size: 14px; }
.sel-bd { font-family: 'Barlow Condensed', sans-serif; font-weight: 500; font-size: 10px; color: var(--muted); white-space: nowrap; }
.sel-x {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 999px;
}
.sel-x:hover { color: var(--bright); background: rgba(255,255,255,0.08); }

/* the finder: a filter box over the list (Radix dropdown; vaul sheet on phones) */
.menu {
  z-index: 50;
  background: #403a3c;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.55);
  display: flex;
  flex-direction: column;
  text-align: left;
}
.tp-menu { width: 300px; padding: 0; max-height: min(60vh, var(--radix-dropdown-menu-content-available-height, 60vh)); overflow: hidden; }
.tp-top { padding: 8px 8px 6px; flex: none; }
.tp-q {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 6px;
  padding: 7px 10px;
  outline: none;
}
.tp-q:focus { border-color: var(--bright); }
.tp-q::placeholder { color: var(--muted); }
.tp-list { overflow-y: auto; padding: 0 4px 4px; display: flex; flex-direction: column; }
.mi {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  outline: none;
}
.mi:hover, .mi[data-highlighted] { background: rgba(255,255,255,0.07); }
.mi.on { color: var(--bright); }
.tp-logo { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; filter: var(--fx-base); }
.tp-ini { width: 22px; text-align: center; color: var(--muted); font-weight: 600; flex-shrink: 0; }
.tp-name { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-rec { font-family: 'Barlow Condensed', sans-serif; font-weight: 500; font-size: 12px; color: var(--muted); }
.tp-none { color: var(--muted); font-style: italic; font-size: 13px; padding: 10px 12px; margin: 0; }
.sheet-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 60; }
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 61; height: 62vh;
  background: #403a3c; border-top: 1px solid rgba(255,255,255,0.18); border-radius: 12px 12px 0 0;
  display: flex; flex-direction: column; outline: none;
}
.sheet::before { content: ''; width: 36px; height: 4px; border-radius: 2px; background: var(--muted); margin: 8px auto 4px; flex: none; }
.sheet-title { font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); text-align: center; margin: 0 0 4px; }
.sheet-body { overflow-y: auto; padding: 0 0 24px; display: flex; flex-direction: column; }
.sheet-body .mi { padding: 10px 18px; font-size: 14px; }
.sheet .tp-top { padding: 4px 14px 8px; }

/* The icon bar under the sentence, and the copied toast beneath it */
.cg-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  position: relative;
  margin-bottom: 14px;
}
.ico {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--muted);
  display: inline-flex;
  border-radius: 4px;
  transition: color 0.15s;
}
.ico:hover { color: var(--bright); }
.toast {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--bright);
  white-space: nowrap;
}

/* Grid + leaderboard layout */
.cg-layout {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 100%;
}

/* Leaderboard sidebar */
.cg-lb {
  width: 292px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.cg-lb-title {
  font-family: 'Oswald', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 10px 12px 6px;
}
.cg-lb-list {
  overflow-y: auto;
  padding: 0 4px 4px;
  scrollbar-width: thin;
}
.cg-lb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  color: var(--muted);
  transition: color 0.12s ease, background 0.12s ease;
}
.cg-lb-row:hover {
  background: rgba(255,255,255,0.05);
  color: var(--bright);
}
.cg-lb-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
  filter: var(--fx-base);
}
.cg-lb-logo--text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 7px;
  font-weight: 700;
  color: #fff;
}
.cg-lb-name {
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cg-lb-count {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 12px;
  min-width: 16px;
  text-align: right;
}
.cg-lb-bd {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.cg-lb-spark {
  width: 40px;
  height: 9px;
  flex-shrink: 0;
  fill: currentColor;
  opacity: 0.75;
}

/* Scrollable grid wrapper */
.cg-scroll {
  overflow: auto;
  max-width: 100%;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  -webkit-overflow-scrolling: touch;
  overflow-anchor: none;
}

/* Grid — cell/year/header widths come from --*-default custom props that
   the JSX component sets inline, but the computed values live here in CSS
   so media queries can override them without getting shadowed by inline
   styles. */
.cg-grid {
  display: grid;
  position: relative;
  --cell-w: var(--cell-w-default, 32px);
  --year-w: var(--year-w-default, 48px);
  --header-h: var(--header-h-default, 56px);
  grid-template-columns: var(--year-w) repeat(var(--sport-count), var(--cell-w));
  grid-template-rows: var(--header-h) repeat(var(--year-count), var(--cell-w));
  /* Clip horizontal overflow from the last sport header's tooltip ::after,
     which would otherwise push scrollWidth ~20px past the grid and produce
     a phantom column on the right. Vertical overflow stays visible so the
     tooltip itself can still render below the header. */
  overflow-x: clip;
  overflow-y: visible;
}

/* Corner cell */
.cg-corner {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 20;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

/* Sport column headers */
.cg-sport-hdr {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 2px 0;
  cursor: help;
}
/* Masked SVG icon so it wears the theme ink; brightens on header hover.
   Figure glyphs (wrestling, water polo) go mushy below 16px, so the cap
   stays at 18px and only mobile shrinks them. */
.cg-sport-icon {
  width: clamp(11px, calc(var(--cell-w) * 0.62), 18px);
  height: clamp(11px, calc(var(--cell-w) * 0.62), 18px);
  background: var(--muted);
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
  transition: background 0.12s ease;
}
.cg-sport-hdr:hover .cg-sport-icon {
  background: var(--bright);
}
.cg-sport-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(6px, calc(var(--cell-w) * 0.3), 9px);
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1;
  color: var(--muted);
}
.cg-sport-gender {
  font-size: clamp(6px, calc(var(--cell-w) * 0.32), 10px);
  line-height: 1;
  color: var(--muted);
  font-weight: 600;
}
/* Custom hover tooltip for sport names — replaces the native title
   attribute because browser tooltips take ~500ms to show and flicker
   out on fast mouse movement. */
.cg-tip {
  position: fixed;
  left: 0;
  top: 0;
  background: #453e40;
  color: var(--bright);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  z-index: 100;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  transition: opacity 0.12s ease;
}

/* Year labels */
.cg-year {
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
  border-right: 1px solid var(--border);
  user-select: none;
}
.cg-year--decade {
  color: var(--bright);
  font-weight: 500;
  border-bottom: 1px solid rgba(255,255,255,0.18);
}

/* Data cells */
.cg-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  /* The resting board is recessive grey — the same level cells dim to when
     another school is active — so the neutral page never glares and an
     active school's full-opacity color is the only bright thing on it. */
  opacity: 0.22;
  transition: opacity 0.12s ease;
  position: relative;
  overflow: visible;
  contain: layout;
}
.cg-cell--decade {
  border-bottom: 1px solid rgba(255,255,255,0.18);
}
.cg-cell--empty {
  cursor: default;
}

/* Marks — a positioned box holding the white stamp with the color logo
   stacked on top; --sel (0 default, 1 on the active school) crossfades
   them. Sized against the cell so they shrink cleanly on mobile. */
.cg-mark {
  position: relative;
  width: 82%;
  height: 82%;
  pointer-events: none;
}
.cg-logo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: auto;
}
.cg-logo--mono {
  opacity: calc(0.92 * (1 - var(--sel, 0)));
  transition: opacity 0.15s ease;
}
.cg-logo--color {
  opacity: var(--sel, 0);
  filter: var(--fx-base);
  transition: opacity 0.15s ease;
}
/* Schools without a baked stamp fall back to filtering the color logo:
   not as solid as a stamp, but legible until gen-mono-logos runs again. */
.cg-logo--auto {
  filter: var(--fx-base)
    grayscale(calc(1 - var(--sel, 0)))
    brightness(calc(1 + 0.55 * (1 - var(--sel, 0))));
  transition: filter 0.15s ease;
}
.cg-fallback {
  filter: grayscale(calc(1 - var(--sel, 0)));
  transition: filter 0.15s ease;
}
/* For logos whose only variant is solid-dark on transparent (e.g. Long
   Beach State), flip to white so they read on the dark canvas. */
.cg-logo--invert {
  --fx-base: invert(1) brightness(1.6);
}

/* Text fallback */
.cg-fallback {
  width: 78%;
  height: 78%;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  font-size: clamp(6px, calc(var(--cell-w) * 0.26), 9px);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  pointer-events: none;
}

/* Shared championship — two logos split diagonally (top-left / bottom-right).
   Each half is its own hit target so hover/click target the correct school. */
.cg-cell--shared {
  position: relative;
}
.cg-half {
  position: absolute;
  inset: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cg-half--a {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
.cg-half--b {
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
}
.cg-half .cg-mark,
.cg-half .cg-fallback {
  width: 52%;
  height: 52%;
  position: absolute;
}
.cg-half--a .cg-mark,
.cg-half--a .cg-fallback {
  top: 8%;
  left: 8%;
}
.cg-half--b .cg-mark,
.cg-half--b .cg-fallback {
  bottom: 8%;
  right: 8%;
}

/* COVID dash */
.cg-covid {
  color: rgba(255,255,255,0.15);
  font-size: 16px;
  font-weight: 300;
}

/* Method: an open intro, then sections that fold; a summary reads as a small heading */
.cg-method {
  margin-top: 28px;
  max-width: 640px;
  width: 100%;
  text-align: left;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.55;
}
.cg-method h2 {
  font-family: 'Oswald', sans-serif;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bright);
  text-align: center;
  margin: 0 0 8px;
}
.cg-method p { margin: 8px 0; }
.cg-method b { color: var(--text); font-weight: 600; }
.cg-method a {
  color: var(--text);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.cg-method a:hover { color: var(--bright); }
.cg-method details { margin: 10px 0; }
.cg-method summary {
  cursor: pointer;
  color: var(--text);
  font-weight: 600;
  font-size: 14px;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cg-method summary::-webkit-details-marker { display: none; }
.cg-method summary::before {
  content: '';
  width: 6px;
  height: 6px;
  border-right: 1px solid var(--muted);
  border-bottom: 1px solid var(--muted);
  transform: rotate(-45deg);
  transition: transform 0.15s;
  flex: none;
}
.cg-method details[open] > summary::before { transform: rotate(45deg); }
.cg-method summary:hover { color: var(--bright); }
.cg-method details[open] > summary { margin-bottom: 4px; }
.cg-method details > p { margin: 8px 0 8px 14px; }

/* What to read next */
.cg-readnext {
  margin-top: 34px;
  max-width: 640px;
  text-align: center;
}
.cg-readnext h2 {
  font-family: 'Oswald', sans-serif;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bright);
  margin: 0 0 6px;
}
.cg-readnext p {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.5;
  margin: 4px 0;
}
.cg-readnext a {
  color: var(--bright);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.cg-readnext a:hover { color: var(--accent); }

/* The notes: the citing ask and the Ko-fi line */
.cg-notes {
  margin-top: 20px;
  max-width: 600px;
  text-align: center;
}
.cg-notes p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.cg-notes p + p { margin-top: 6px; }
.cg-notes a {
  color: var(--text);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.cg-notes a:hover { color: var(--bright); }

/* Footer */
.cg-footer {
  margin-top: 20px;
  max-width: 600px;
  text-align: center;
}
.cg-footer p + p {
  margin-top: 8px;
}
.cg-footer a {
  color: var(--text);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.cg-footer a:hover {
  color: var(--bright);
}
.cg-footer p {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
}

/* Tablet and down: leaderboard drops below the grid as a full-width panel
   with its own scroll instead of a sticky sidebar. */
@media (max-width: 900px) {
  .cg-layout {
    flex-direction: column;
    align-items: stretch;
  }
  .cg-lb {
    position: static;
    width: 100%;
    max-height: 280px;
  }
}

/* Responsive: on phones, shrink cells + year column so the full grid
   fits within the viewport horizontally (vertical scroll is fine). */
@media (max-width: 640px) {
  .cg-page { padding: 12px 4px 24px; }
  .cg-header h1 { font-size: 18px; }

  .cg-scroll {
    overflow-x: hidden;
    max-width: 100%;
  }
  .cg-grid {
    --year-w: 28px;
    --header-h: 44px;
    /* cell width = (viewport − year col − horizontal padding) / column count,
       capped at the desktop default so large phones don't balloon */
    --cell-w: min(
      var(--cell-w-default, 32px),
      calc((100vw - 28px - 10px) / var(--sport-count))
    );
  }
  .cg-year {
    font-size: 9px;
    padding-right: 3px;
  }
  /* the page's gutter is 4px for the grid's sake; the prose keeps a margin */
  .cg-readnext, .cg-notes, .cg-method, .cg-footer { padding: 0 12px; }
}
`;
