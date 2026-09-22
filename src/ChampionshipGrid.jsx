import { useState, useMemo, useCallback, useRef, useEffect, Fragment, memo } from 'react';
import {
  SPORTS,
  SCHOOLS,
  CHAMPIONSHIPS,
  YEARS,
  getLogoUrl,
  getMonoLogoUrl,
} from './championshipData';

// Sport header icons (Fluent Emoji High Contrast, MIT — see src/icons/).
// Applied as CSS masks so they wear the theme's ink color.
const SPORT_ICONS = import.meta.glob('./icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const sportIconUrl = (name) => SPORT_ICONS[`./icons/${name}.svg`];

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
  let css = '.cg-active-scope.has-active .cg-cell { opacity: 0.22; }\n';
  for (const s of present) {
    const e = esc(s);
    const c = activeClass(s);
    css += `.cg-active-scope.${c} .cg-cell[data-school="${e}"],.cg-active-scope.${c} .cg-cell[data-school-2="${e}"]{opacity:1;}\n`;
    // --sel crossfades the white stamp out and the color logo in (inherited
    // by both <img>s of the mark). Shared cells carry both schools, so only
    // the active school's half flips.
    css += `.cg-active-scope.${c} .cg-cell[data-school="${e}"]:not(.cg-cell--shared),.cg-active-scope.${c} .cg-cell--shared[data-school="${e}"] .cg-half--a,.cg-active-scope.${c} .cg-cell--shared[data-school-2="${e}"] .cg-half--b,.cg-active-scope.${c} .cg-lb-row[data-school="${e}"]{--sel:1;}\n`;
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

// Read ?s=... (repeatable) on first render so shared links land on the
// right selection. Legacy ?a=/?b=/?school= are still honored for older links.
const initialSelectionFromUrl = () => {
  if (typeof window === 'undefined') return [];
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
  const [selection, setSelection] = useState(initialSelectionFromUrl);
  const [copied, setCopied] = useState(false);
  const scopeRef = useRef(null);

  // Keep ?s= in sync with the selection and drop legacy params.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('school');
    url.searchParams.delete('a');
    url.searchParams.delete('b');
    url.searchParams.delete('s');
    for (const s of selection) url.searchParams.append('s', s);
    window.history.replaceState(null, '', url);
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

  // Count titles per school across all sports shown, broken down by the
  // sport's gender. Shared titles (array values) credit each co-champion
  // with one title.
  const schoolTitles = useMemo(() => {
    const counts = {};
    for (const sport of SPORTS) {
      const data = CHAMPIONSHIPS[sport.key] || {};
      const gender = sport.gender;
      for (const value of Object.values(data)) {
        if (!value) continue;
        const schools = Array.isArray(value) ? value : [value];
        for (const school of schools) {
          const entry =
            counts[school] || (counts[school] = { total: 0, male: 0, female: 0 });
          entry.total += 1;
          if (gender === '♂') entry.male += 1;
          else if (gender === '♀') entry.female += 1;
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

  const onEnter = useCallback((school) => {
    setHighlighted(school);
  }, []);

  const onLeave = useCallback(() => {
    setHighlighted(null);
  }, []);

  const toggleSchool = useCallback((school) => {
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

  const shareTitle = useMemo(() => {
    if (selection.length === 0) {
      return 'Every NCAA D-I national champion since 1990, in one grid';
    }
    if (selection.length === 1) {
      return `Every NCAA D-I national title ${selection[0]} has won since 1990`;
    }
    if (selection.length === 2) {
      return `${selection[0]} vs ${selection[1]} — NCAA D-I championships since 1990`;
    }
    const head = selection.slice(0, -1).join(', ');
    const tail = selection[selection.length - 1];
    return `${head} vs ${tail} — NCAA D-I championships since 1990`;
  }, [selection]);

  const copyLink = useCallback(async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can fail on http: or inside some iframes — silently ignore.
    }
  }, []);

  const shareToReddit = useCallback((e) => {
    e.stopPropagation();
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(shareTitle);
    window.open(
      `https://www.reddit.com/submit?url=${url}&title=${title}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [shareTitle]);

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

  // Leaderboard rows: every school with at least one title, most titles
  // first, ties alphabetical.
  const leaderboard = useMemo(
    () =>
      Object.entries(schoolTitles)
        .map(([school, t]) => ({ school, total: t.total }))
        .sort((a, b) => b.total - a.total || a.school.localeCompare(b.school)),
    [schoolTitles],
  );

  return (
    <div className="cg-page" onClick={clearSelection}>
      <style>{STYLES}</style>
      <style>{SCHOOL_HIGHLIGHT_CSS}</style>

      {/* Header */}
      <header className="cg-header">
        <h1>NCAA Division I Championships</h1>
        <p className="cg-sub">
          {yearRange} &middot; {SPORTS.length} sports
        </p>
      </header>

      {/* Compare picker — Mantine-style combobox */}
      <div className="cg-picker-wrap" onClick={(e) => e.stopPropagation()}>
        <ComparePicker
          selection={selection}
          onChange={setSelection}
          schools={schoolOptions}
          titleCounts={schoolTitles}
        />
      </div>

      {/* Info bar */}
      <div className={`cg-info ${activeSchools.length > 0 ? 'cg-info--active' : ''}`}>
        {activeSchools.length > 0 ? (
          <div className="cg-info-inner">
            {activeSchools.map((s, i) => {
              const info = SCHOOLS[s];
              const logo = getLogoUrl(s);
              return (
                <Fragment key={s}>
                  {i > 0 && <span className="cg-info-vs">vs</span>}
                  <div className="cg-info-school">
                    {logo && (
                      <img
                        src={logo}
                        alt=""
                        className={
                          'cg-info-logo' +
                          (info?.invertLogo ? ' cg-logo--invert' : '')
                        }
                      />
                    )}
                    <span className="cg-info-name">{s}</span>
                    <span className="cg-info-count">{schoolTitles[s]?.total || 0}</span>
                    {schoolTitles[s] && (schoolTitles[s].male > 0 || schoolTitles[s].female > 0) && (
                      <span className="cg-info-breakdown" aria-label="Breakdown by sport gender">
                        <span className="cg-info-bd">
                          <span aria-hidden="true">♂</span>
                          <span className="cg-sr-only">Men&rsquo;s:</span>
                          {schoolTitles[s].male}
                        </span>
                        <span className="cg-info-bd">
                          <span aria-hidden="true">♀</span>
                          <span className="cg-sr-only">Women&rsquo;s:</span>
                          {schoolTitles[s].female}
                        </span>
                      </span>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="cg-info-placeholder">
            Pick schools to compare
          </div>
        )}
      </div>

      {/* Share row */}
      <div className="cg-share" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cg-share-btn" onClick={copyLink}>
          {copied
            ? 'Link copied'
            : selection.length > 0
            ? 'Copy link to this view'
            : 'Copy link'}
        </button>
        <button type="button" className="cg-share-btn" onClick={shareToReddit}>
          Share on Reddit
        </button>
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

      <footer className="cg-footer">
        <p>
          Football uses AP poll champion (pre-BCS era) and BCS/CFP champion.
          Year 2020 dashes indicate seasons canceled due to COVID-19.
          Data sourced from NCAA records.
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

// Ranked list of schools by total titles. Rows share the grid's hover/select
// mechanics: hovering previews the school in color on the board, clicking
// toggles it into the selection. Visual active state comes entirely from
// SCHOOL_HIGHLIGHT_CSS via data-school, so the memo never breaks on hover.
const Leaderboard = memo(function Leaderboard({ rows, onEnter, onLeave, onToggle }) {
  return (
    <aside className="cg-lb" onClick={(e) => e.stopPropagation()}>
      <div className="cg-lb-title">Most titles</div>
      <div className="cg-lb-list">
        {rows.map(({ school, total }) => (
          <button
            type="button"
            key={school}
            className="cg-lb-row"
            data-school={school}
            onMouseEnter={() => onEnter(school)}
            onMouseLeave={onLeave}
            onClick={() => onToggle(school)}
          >
            <SchoolMark school={school} />
            <span className="cg-lb-name">{school}</span>
            <span className="cg-lb-count">{total}</span>
          </button>
        ))}
      </div>
    </aside>
  );
});

// Mantine/antd-style multi-select combobox. Typeable search + keyboard
// nav + click pills to remove.
function ComparePicker({ selection, onChange, schools, titleCounts }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      if (selection.includes(s)) return false;
      if (!q) return true;
      return s.toLowerCase().includes(q);
    });
  }, [schools, selection, query]);

  // Clamp the highlighted option whenever the filtered list shrinks.
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered.length, activeIdx]);

  // Close on outside mousedown so pill × buttons can still fire.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commit = (school) => {
    const next = selection.includes(school)
      ? selection.filter((s) => s !== school)
      : [...selection, school];
    onChange(next);
    setQuery('');
    setActiveIdx(0);
    inputRef.current?.focus();
  };

  const remove = (school, e) => {
    e.stopPropagation();
    onChange(selection.filter((s) => s !== school));
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (filtered[activeIdx]) {
        e.preventDefault();
        commit(filtered[activeIdx]);
      }
    } else if (e.key === 'Backspace' && !query && selection.length > 0) {
      onChange(selection.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const openAndFocus = () => {
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="cg-picker" onClick={openAndFocus}>
      <div className="cg-picker-control">
        <span className="cg-picker-label">Compare</span>
        {selection.map((school) => {
          const info = SCHOOLS[school];
          const logo = getLogoUrl(school);
          return (
            <span
              key={school}
              className="cg-pill"
              style={{ borderColor: info?.color || 'rgba(255,255,255,0.2)' }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  className={
                    'cg-pill-logo' + (info?.invertLogo ? ' cg-logo--invert' : '')
                  }
                />
              ) : (
                <span
                  className="cg-pill-logo cg-pill-logo--text"
                  style={{ background: info?.color || '#555' }}
                >
                  {info?.abbr || school.slice(0, 3)}
                </span>
              )}
              <span className="cg-pill-name">{school}</span>
              <button
                type="button"
                className="cg-pill-x"
                aria-label={`Remove ${school}`}
                onClick={(e) => remove(school, e)}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          className="cg-picker-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={
            selection.length === 0
              ? 'Search to compare schools…'
              : 'Add another school…'
          }
        />
      </div>
      {open && filtered.length > 0 && (
        <div ref={listRef} className="cg-picker-menu" role="listbox">
          {filtered.slice(0, 80).map((school, i) => {
            const info = SCHOOLS[school];
            const logo = getMonoLogoUrl(school) || getLogoUrl(school);
            const isAuto = !getMonoLogoUrl(school);
            const isActive = i === activeIdx;
            return (
              <div
                key={school}
                role="option"
                aria-selected={isActive}
                className={
                  'cg-picker-option' +
                  (isActive ? ' cg-picker-option--active' : '')
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(school);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    className={
                      'cg-picker-opt-logo' +
                      (isAuto ? ' cg-picker-opt-logo--auto' : '') +
                      (info?.invertLogo ? ' cg-logo--invert' : '')
                    }
                  />
                ) : (
                  <div
                    className="cg-picker-opt-logo cg-picker-opt-logo--text"
                    style={{ background: info?.color || '#555' }}
                  >
                    {info?.abbr || school.slice(0, 3)}
                  </div>
                )}
                <span className="cg-picker-opt-name">{school}</span>
                <span className="cg-picker-opt-count">
                  {titleCounts[school]?.total || 0}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@400;500;600&display=swap');

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
  font-family: 'Oswald', sans-serif;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--bright);
  margin-top: 6px;
}
.cg-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

/* Compare picker */
.cg-picker-wrap {
  width: 100%;
  max-width: 720px;
  margin-bottom: 10px;
}
.cg-picker {
  position: relative;
  cursor: text;
}
.cg-picker-control {
  min-height: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.15s;
}
.cg-picker:focus-within .cg-picker-control {
  border-color: rgba(255,255,255,0.22);
}
.cg-picker-label {
  font-family: 'Oswald', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 2px;
}
.cg-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--bright);
  max-width: 220px;
}
.cg-pill-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
  filter: var(--fx-base);
}
.cg-pill-logo--text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 8px;
  color: #fff;
}
.cg-pill-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cg-pill-x {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 3px;
  border-radius: 3px;
}
.cg-pill-x:hover {
  color: var(--bright);
  background: rgba(255,255,255,0.08);
}
.cg-picker-input {
  flex: 1;
  min-width: 140px;
  background: none;
  border: none;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  padding: 4px 2px;
}
.cg-picker-input::placeholder {
  color: var(--muted);
}
.cg-picker-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #403a3c;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.55);
  max-height: 320px;
  overflow-y: auto;
  z-index: 50;
  padding: 4px;
}
.cg-picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  border-radius: 5px;
}
.cg-picker-option--active {
  background: rgba(255,255,255,0.07);
}
.cg-picker-opt-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  filter: var(--fx-base) var(--fx-mono);
}
.cg-picker-opt-logo--text {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
}
.cg-picker-opt-name {
  flex: 1;
  color: var(--text);
}
.cg-picker-opt-count {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 11px;
  color: var(--muted);
}

/* Info bar */
.cg-info {
  width: 100%;
  max-width: 720px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  margin-bottom: 16px;
  transition: border-color 0.2s, background 0.2s;
  overflow: hidden;
  padding: 0;
}
.cg-info--active {
  border-color: rgba(255,255,255,0.12);
}
.cg-info-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: nowrap;
  /* Fit the inner row to the info-bar height so overflow-x scrolls instead
     of stretching the container vertically when many schools are active. */
  height: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 12px;
  scrollbar-width: thin;
}
.cg-info-school {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.cg-info-vs {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  flex-shrink: 0;
}
.cg-info-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: var(--fx-base);
}
.cg-info-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--bright);
}
.cg-info-count {
  font-size: 12px;
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
}
.cg-info-breakdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 6px;
  margin-left: 2px;
  border-left: 1px solid rgba(255,255,255,0.12);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 11px;
  color: var(--muted);
}
.cg-info-bd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.cg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.cg-info-placeholder {
  font-size: 13px;
  color: var(--muted);
}

/* Share row */
.cg-share {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.cg-share-btn {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.cg-share-btn:hover {
  color: var(--bright);
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.04);
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
  width: 216px;
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
  padding: 3px 8px;
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
.cg-lb-row .cg-mark,
.cg-lb-row .cg-fallback {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.cg-lb-row .cg-fallback {
  border-radius: 3px;
  font-size: 7px;
}
.cg-lb-name {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cg-lb-count {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 500;
  font-size: 12px;
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
.cg-sport-hdr::after {
  content: attr(data-name);
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
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
  z-index: 30;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  transition: opacity 0.12s ease;
}
/* Last sport header: anchor the tooltip to the column's right edge so it
   stays within the grid's clipped x-overflow instead of being cut off. */
.cg-sport-hdr:has(+ .cg-year)::after {
  left: auto;
  right: 0;
  transform: none;
}
.cg-sport-hdr:hover::after {
  opacity: 1;
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

/* Footer */
.cg-footer {
  margin-top: 20px;
  max-width: 600px;
  text-align: center;
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
  .cg-info { height: 40px; }
  .cg-info-name { font-size: 13px; }
  .cg-info-placeholder { font-size: 11px; padding: 0 8px; text-align: center; }

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
}
`;
