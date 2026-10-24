// The other sports sites on drewhoover.com, in the order every one of them
// lists the others. The page's "What to read next" and dist/llms.txt both
// read this list, so the words are typed once.
/** Putting Up Numbers (puttingupnumbers.com), where the comparators live now: one link a sport */
const PUN_SPORTS = [['College Football', 'cfb'], ['NFL', 'nfl'], ['NBA', 'nba'], ['WNBA', 'wnba'], ['NHL', 'nhl'], ['Soccer', 'soccer']].map(([name, id]) => ({ name, url: `https://puttingupnumbers.com/${id}/` }))
export const SIBLINGS = [
  { name: 'Putting Up Numbers', url: 'https://puttingupnumbers.com/', words: 'compare players, coaches, and teams on wins.', links: PUN_SPORTS },
  { name: 'College Football Streak King', url: 'https://drewhoover.com/cfb-streak-king/', words: 'the longest active and all-time winning and losing streaks in college football, under any definition, every FBS game since 1936.' },
  { name: 'Hostile Territory', url: 'https://drewhoover.com/hostile-territory/', words: "every head coach's true road record against AP top-10 teams since 1936." },
  { name: 'How Many Rings?', url: 'https://drewhoover.com/how-many-rings/', words: 'every person on a national-championship staff since 1990, ranked by the number of rings they can claim.' },
  { name: 'CFB All-Time Records', url: 'https://drewhoover.com/cfb-all-time-records/', words: 'all-time win-loss, bowl and national-title records for every FBS program.' },
];
