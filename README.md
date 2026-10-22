# Collegiate Championships

**Who has the most collegiate sports championships?** — every NCAA Division I national champion in 33 sports from 1972 to present, laid out as a hoverable grid of team logos. Hover, tap, or pick schools to highlight every other championship a school has won across all sports and years.

**Live site:** https://drewhoover.com/collegiate-championships/

Built with React + Vite and deployed to GitHub Pages.

> Extracted from [`cfb-all-time-records`](https://github.com/DrewHoo/cfb-all-time-records), which paired this grid with an FBS football records table. The football table stayed in that repo; this repo is the championship grid on its own so the URL isn't football-specific.

## Which sports make the grid

A sport is included when it clears at least two of three lenses — sponsorship
(how many D-I schools field a team), popularity (attendance and viewership),
and Olympic relevance — or is the gender counterpart of a sport that does.
That rule admits every long-standing championship people expect (football
passes on sponsorship + popularity; swimming on sponsorship + Olympic;
wrestling on popularity + sponsorship) plus women's rowing, men's gymnastics,
and women's wrestling — and it is why women's bowling, fencing, rifle, and
skiing are absent (one lens at most, and the last three are coed
championships that don't fit the grid's men's/women's structure). Six
columns are National Collegiate rather than Division I titles, decided
across all divisions: men's volleyball and gymnastics, both water polos,
women's gymnastics, ice hockey, and wrestling.

## Data

Championship data is scraped from Wikipedia by `scripts/fetch-data.mjs` and written to `src/championshipData.scraped.json`, which `src/championshipData.js` imports at build time. To refresh the data:

```bash
node scripts/fetch-data.mjs
```

The scraper uses cheerio to parse `<table class="wikitable">` elements on each sport's Wikipedia page, expanding `rowspan`/`colspan` so multi-row headers resolve correctly, merging data from multi-era tables (tennis, golf, swimming) on the same page, scoping the scrape to one table via `tableMatch` where a page also carries a non-NCAA champions table (softball's AIAW era), and normalizing team names via a shared rename map. Football is handled by a dedicated parser that collapses the NCAA FBS consensus champions table — which lists one row per (year, selector) pair — into one winner per year, preferring CFP > BCS > AP > Coaches, and emitting both schools for the seasons those selectors split (1973, 1974, 1978, 1990, 1991, 1997, 2003). Coverage runs from 1972; the 1972 football and men's basketball champions predate the 1973 divisional split and are University Division champions.

Adding a new sport is a matter of appending one entry to the `SOURCES` array in `scripts/fetch-data.mjs` — URL, parser type (`wikipediaTable`, `footballConsensus`, or `csv`), and optional `yearCol` / `winnerCol` / `rename` / `tableMatch` hints — and re-running the scraper.

Three helper scripts sit alongside the main scraper:

- `scripts/diff_scraped.mjs` — diffs the scraped JSON against whatever is currently in `championshipData.js`, useful after a re-scrape to see what changed upstream on Wikipedia.
- `scripts/reconcile.mjs` — merges scraped and memory data and reports any schools referenced in the merged result that are missing from the `SCHOOLS` map in `championshipData.js`.
- `scripts/gen_champs.mjs` — regenerates the `CHAMPIONSHIPS` block in `championshipData.js` after a re-scrape.

Data refresh is manual — there is no scheduled workflow. Re-run the scraper when a season's champions are finalized, review the diff, and commit.

## Local development

```bash
npm install
npm run dev
```

Dev server opens at `http://localhost:5173/collegiate-championships/`.

## Picking schools

The sentence under the title holds the picks as chips (mark, name, titles, the men's/women's split, an ×) and a dashed `+` that opens a finder (`src/components/SchoolPicker.jsx`: a Radix dropdown on desktop, a vaul bottom sheet on phones). Hovering or clicking the board or the leaderboard still previews and toggles a school; `?s=School` (repeatable) carries the picks, and the tab title follows them.

## Share images

- `npm run gen:og` (on a Mac: the title is Georgia Bold from the system) draws `public/og-grid.png` (1200×630) and `public/card.png` (1200×750, the 8:5 cover the index site's sports list shows) from the real board: the newest complete years as one-color stamps, the leading school lit in the accent, text as glyph outlines through opentype.js (the OFL fonts in `scripts/fonts/` are @fontsource's static woff files). Committed; re-run after a redesign or a data refresh worth committing.
- `workers/share/` is a Cloudflare Worker on `drewhoover.com/collegiate-championships/*` in front of Pages. For a `?s=` address it rewrites the `<head>` with the site's own words (`src/lib/share.js`) and points `og:image` at `share/og.png?s=…`, which it draws on demand with workers-og (one school's titles by sport, or several schools side by side) and caches at the edge. Crawler fetches are counted in Mixpanel as `share unfurl` and `share card`. Anything else, and anything that fails, passes through untouched.

```bash
npm run build && npm run preview       # the origin the worker proxies locally (4174)
npm run worker:dev                     # http://localhost:8788/collegiate-championships/share/og.png?s=Stanford
npm run worker:deploy                  # by hand; deploy.yml does it after every push to main (CLOUDFLARE_API_TOKEN secret)
```

Bump `CARD_VERSION` in `workers/share/index.ts` whenever the card or the URL reading changes; it keys the edge cache.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm run build` (`vite build`, then `scripts/prerender.mjs`, which renders the grid into `dist/index.html` so crawlers get the page's text rather than an empty root, and writes `dist/sitemap.xml`) publishes `./dist` to GitHub Pages, then deploys the share worker. The Vite `base` is set to `/collegiate-championships/` in `vite.config.js` — if you fork this, update that to match your repo name.
