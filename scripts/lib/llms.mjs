// llms.txt (llmstxt.org): the site in plain markdown for a language model
// that reads it, the way a person reads the grid: what it is, where the
// data comes from, the other sports sites, and how to cite it. Said the way
// the page says it, nothing more. The NBA Comparator's, in shape.
//
//   fs.writeFileSync(path.join(ROOT, 'dist', 'llms.txt'), llmsText({ ... }))

const REPO = 'https://github.com/DrewHoo/collegiate-championships'

/**
 * The llms.txt markdown.
 * @param {{
 *   site: string,          // the site's URL, with the trailing slash
 *   title: string,         // the page's <title>
 *   description: string,   // the page's description: the sentence, the leader, the count of schools
 *   first: number,         // the grid's first year (1972)
 *   last: number,          // the grid's last year
 *   sports: number,        // how many sports (33)
 *   schools: number,       // how many schools have won at least one title
 *   siblings: { name: string, url: string, words: string }[],
 * }} o
 */
export function llmsText({ site, title, description, first, last, sports, schools, siblings }) {
  return `# ${title}

> ${description}

One grid: a column per sport (${sports} of them, men's and women's), a row per year from ${first} to ${last}, and in each cell the school that won that year's NCAA Division I national championship (two marks where a title was shared). Pick a school and every title it has won lights up across the grid; the leaderboard beside it ranks the ${schools.toLocaleString('en-US')} schools that have won at least one. A school's address is ${site}?s=<School>, repeatable, so a link carries a comparison.

## Data

- The champions come from each sport's championship page on [Wikipedia](https://en.wikipedia.org/wiki/NCAA_Division_I), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), read by the scraper in the repository.
- [Method](${site}#method): why these ${sports} sports, what counts as a championship (the football selectors, the University Division years, the National Collegiate titles, the shared titles), when each women's column begins, and why there is no men's rowing column.
- [The repository](${REPO}): the scraper, the data and the grid.

## The other sports sites

${siblings.map((s) => `- [${s.name}](${s.url})${s.links ? ':' : ' —'} ${s.words}${s.links ? ' ' + s.links.map((l) => `[${l.name}](${l.url})`).join(' | ') : ''}`).join('\n')}

## Citing

If a count from this page ends up in your article, broadcast, podcast or thread, please cite it: name the site and link to the page; the url encodes the schools.
`
}
