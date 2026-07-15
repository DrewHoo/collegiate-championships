// NCAA Division I National Championship Data
// Sources: NCAA records, AP polls (football pre-CFP era), plus GitHub-hosted datasets
// (see scripts/fetch-data.mjs for the scraper that populates the .scraped.json).
// Year convention: football = fall season year; all other sports = tournament/championship year

import scraped from './championshipData.scraped.json';

// Each sport has:
//   key       — referenced throughout the app
//   name      — full display name (shown in tooltips and the info bar)
//   short     — short code (currently unused; reserved for compact layouts)
//   icon      — emoji shown in the column header. Prefer emoji that
//               depict people doing the sport (⛹ 🏌 🏃 🏊 🤸 🤽 🤼) over
//               ball-only or equipment-only emoji, reserving the
//               equipment emoji for sports where no person variant
//               exists (⚾ 🥎 🏈 ⚽ 🎾 🏑 🏐 🥍 🏒).
//   gender    — "♂" or "♀" glyph rendered beneath the icon. Set on
//               every sport (including single-gender sports) so the
//               header layout is consistent across all columns.
export const SPORTS = [
  { key: 'football',  name: 'Football',                     short: 'FB',  icon: '🏈', gender: '♂' },
  { key: 'mbb',       name: "Men's Basketball",             short: 'MBK', icon: '⛹',  gender: '♂' },
  { key: 'wbb',       name: "Women's Basketball",           short: 'WBK', icon: '⛹',  gender: '♀' },
  { key: 'baseball',  name: 'Baseball',                     short: 'BSB', icon: '⚾', gender: '♂' },
  { key: 'softball',  name: 'Softball',                     short: 'SB',  icon: '🥎', gender: '♀' },
  { key: 'mvb',       name: "Men's Volleyball",             short: 'MVB', icon: '🏐', gender: '♂' },
  { key: 'wvb',       name: "Women's Volleyball",           short: 'WVB', icon: '🏐', gender: '♀' },
  { key: 'mih',       name: "Men's Ice Hockey",             short: 'MIH', icon: '🏒', gender: '♂' },
  { key: 'wih',       name: "Women's Ice Hockey",           short: 'WIH', icon: '🏒', gender: '♀' },
  { key: 'msoc',      name: "Men's Soccer",                 short: 'MSO', icon: '⚽', gender: '♂' },
  { key: 'wsoc',      name: "Women's Soccer",               short: 'WSO', icon: '⚽', gender: '♀' },
  { key: 'mlax',      name: "Men's Lacrosse",               short: 'MLX', icon: '🥍', gender: '♂' },
  { key: 'wlax',      name: "Women's Lacrosse",             short: 'WLX', icon: '🥍', gender: '♀' },
  { key: 'wfh',       name: "Women's Field Hockey",         short: 'WFH', icon: '🏑', gender: '♀' },
  { key: 'wgym',      name: "Women's Gymnastics",           short: 'WGY', icon: '🤸', gender: '♀' },
  { key: 'mten',      name: "Men's Tennis",                 short: 'MTN', icon: '🎾', gender: '♂' },
  { key: 'wten',      name: "Women's Tennis",               short: 'WTN', icon: '🎾', gender: '♀' },
  { key: 'mgolf',     name: "Men's Golf",                   short: 'MGF', icon: '🏌', gender: '♂' },
  { key: 'wgolf',     name: "Women's Golf",                 short: 'WGF', icon: '🏌', gender: '♀' },
  { key: 'mswim',     name: "Men's Swimming & Diving",      short: 'MSW', icon: '🏊', gender: '♂' },
  { key: 'wswim',     name: "Women's Swimming & Diving",    short: 'WSW', icon: '🏊', gender: '♀' },
  { key: 'mwp',       name: "Men's Water Polo",             short: 'MWP', icon: '🤽', gender: '♂' },
  { key: 'wwp',       name: "Women's Water Polo",           short: 'WWP', icon: '🤽', gender: '♀' },
  { key: 'wrestling', name: 'Wrestling',                    short: 'WRS', icon: '🤼', gender: '♂' },
  { key: 'mxc',       name: "Men's Cross Country",          short: 'MXC', icon: '👟', gender: '♂' },
  { key: 'wxc',       name: "Women's Cross Country",        short: 'WXC', icon: '👟', gender: '♀' },
  // Track & Field — 🏃 is the closest human-featured emoji for every
  // running event, but we also need to distinguish XC, indoor T&F, and
  // outdoor T&F. Indoor uses 🏟 (arena) and outdoor uses 🏅 (medal) so
  // each sport has a unique icon at a glance while XC keeps the runner.
  { key: 'mitf',      name: "Men's Indoor Track & Field",   short: 'MIT', icon: '🏟', gender: '♂' },
  { key: 'witf',      name: "Women's Indoor Track & Field", short: 'WIT', icon: '🏟', gender: '♀' },
  { key: 'motf',      name: "Men's Outdoor Track & Field",  short: 'MOT', icon: '🏃‍♂️', gender: '♂' },
  { key: 'wotf',      name: "Women's Outdoor Track & Field",short: 'WOT', icon: '🏃‍♀️', gender: '♀' },
];

// ESPN team ID, primary brand color, abbreviation
export const SCHOOLS = {
  'Akron':              { id: 2006,  color: '#041E42', abbr: 'AKR' },
  'Alabama':            { id: 333,   color: '#9E1B32', abbr: 'ALA' },
  'Arizona':            { id: 12,    color: '#CC0033', abbr: 'ARIZ' },
  'Arizona State':      { id: 9,     color: '#8C1D40', abbr: 'ASU' },
  'Arkansas':           { id: 8,     color: '#9D2235', abbr: 'ARK' },
  'Auburn':             { id: 2,     color: '#0C2340', abbr: 'AUB' },
  'Baylor':             { id: 239,   color: '#154734', abbr: 'BAY' },
  'Boston College':     { id: 103,   color: '#98002E', abbr: 'BC' },
  'Boston University':  { id: 104,   color: '#CC0000', abbr: 'BU' },
  'Cal State Fullerton':{ id: 2239,  color: '#00274C', abbr: 'CSUF' },
  'California':         { id: 25,    color: '#003262', abbr: 'CAL', darkLogo: true },
  'Clemson':            { id: 228,   color: '#F56600', abbr: 'CLEM' },
  'Coastal Carolina':   { id: 324,   color: '#006F71', abbr: 'CCU' },
  'Colorado':           { id: 38,    color: '#CFB87C', abbr: 'COLO' },
  'UConn':              { id: 41,    color: '#000E2F', abbr: 'CONN' },
  'Denver':             { id: 2172,  color: '#8B2332', abbr: 'DEN' },
  'Duke':               { id: 150,   color: '#003087', abbr: 'DUKE' },
  'Florida':            { id: 57,    color: '#0021A5', abbr: 'FLA' },
  'Florida State':      { id: 52,    color: '#782F40', abbr: 'FSU' },
  'Fresno State':       { id: 278,   color: '#DB0032', abbr: 'FRES' },
  'Georgetown':         { id: 46,    color: '#041E42', abbr: 'GTWN' },
  'Georgia':            { id: 61,    color: '#BA0C2F', abbr: 'UGA' },
  'Indiana':            { id: 84,    color: '#990000', abbr: 'IND' },
  'Iowa':               { id: 2294,  color: '#FFCD00', abbr: 'IOWA', darkLogo: true },
  'James Madison':      { id: 256,   color: '#450084', abbr: 'JMU' },
  'Johns Hopkins':      { id: 118,   color: '#002D72', abbr: 'JHU' },
  'Kansas':             { id: 2305,  color: '#0051BA', abbr: 'KU' },
  'Kentucky':           { id: 96,    color: '#0033A0', abbr: 'UK' },
  'Lake Superior State':{ id: null,  color: '#003366', abbr: 'LSSU', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/4/47/Lake_Superior_State_University_Lakers_Logo.svg' },
  'Long Beach State':   { id: 299,   color: '#000000', abbr: 'LBSU', invertLogo: true },
  'Louisville':         { id: 97,    color: '#AD0000', abbr: 'LOU' },
  'Loyola Maryland':    { id: 2352,  color: '#006747', abbr: 'LMU' },
  'LSU':                { id: 99,    color: '#461D7C', abbr: 'LSU', darkLogo: true },
  'Maine':              { id: 311,   color: '#003263', abbr: 'ME' },
  'Marshall':           { id: 276,   color: '#00B140', abbr: 'MRSH' },
  'Maryland':           { id: 120,   color: '#E03A3E', abbr: 'MD' },
  'Miami (FL)':         { id: 2390,  color: '#F47321', abbr: 'MIA' },
  'Michigan':           { id: 130,   color: '#00274C', abbr: 'MICH' },
  'Michigan State':     { id: 127,   color: '#18453B', abbr: 'MSU' },
  'Minnesota':          { id: 135,   color: '#7A0019', abbr: 'MINN' },
  'Minnesota Duluth':   { id: null,  color: '#7A0019', abbr: 'UMD', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/6/6a/Minnesota_Duluth_Bulldogs_logo.svg' },
  'Mississippi State':  { id: 177,   color: '#660000', abbr: 'MSST', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Mississippi_State_Bulldogs_logo.svg' },
  'Nebraska':           { id: 158,   color: '#E41C38', abbr: 'NEB' },
  'UNLV':               { id: 2439,  color: '#CF0A2C', abbr: 'UNLV' },
  'North Carolina':     { id: 153,   color: '#7BAFD4', abbr: 'UNC' },
  'North Dakota':       { id: 155,   color: '#009A44', abbr: 'UND' },
  'Northern Michigan':  { id: 2200,  color: '#006747', abbr: 'NMU', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/55/Northern_Michigan_Wildcats_logo.svg' },
  'Northwestern':       { id: 77,    color: '#4E2A84', abbr: 'NW' },
  'Notre Dame':         { id: 87,    color: '#0C2340', abbr: 'ND' },
  'Ohio State':         { id: 194,   color: '#BB0000', abbr: 'OSU', darkLogo: true },
  'Oklahoma':           { id: 201,   color: '#841617', abbr: 'OU' },
  'Oklahoma State':     { id: 197,   color: '#FF6600', abbr: 'OKST' },
  'Ole Miss':           { id: 145,   color: '#CE1126', abbr: 'MISS' },
  'Oregon State':       { id: 204,   color: '#DC4405', abbr: 'ORST' },
  'Penn State':         { id: 213,   color: '#041E42', abbr: 'PSU', darkLogo: true },
  'Pepperdine':         { id: 2492,  color: '#00205C', abbr: 'PEPP' },
  'Princeton':          { id: 163,   color: '#FF6600', abbr: 'PRIN' },
  'Providence':         { id: 2507,  color: '#000000', abbr: 'PROV' },
  'Purdue':             { id: 2509,  color: '#CEB888', abbr: 'PUR' },
  'Quinnipiac':         { id: 2514,  color: '#002B5C', abbr: 'QU' },
  'Rice':               { id: 242,   color: '#002469', abbr: 'RICE' },
  'Santa Clara':        { id: 2541,  color: '#862633', abbr: 'SCU' },
  'South Carolina':     { id: 2579,  color: '#73000A', abbr: 'SC' },
  "St. John's":         { id: 2599,  color: '#CC0000', abbr: 'SJU' },
  'Stanford':           { id: 24,    color: '#8C1515', abbr: 'STAN' },
  'Syracuse':           { id: 183,   color: '#F76900', abbr: 'SYR' },
  'Tennessee':          { id: 2633,  color: '#FF8200', abbr: 'TENN' },
  'Texas':              { id: 251,   color: '#BF5700', abbr: 'TEX' },
  'Texas A&M':          { id: 245,   color: '#500000', abbr: 'TAMU', darkLogo: true },
  'Texas Tech':         { id: 2641,  color: '#CC0000', abbr: 'TTU' },
  'UCLA':               { id: 26,    color: '#2D68C4', abbr: 'UCLA' },
  'UC Santa Barbara':   { id: 2540,  color: '#003660', abbr: 'UCSB' },
  'UMass':              { id: 113,   color: '#881C1C', abbr: 'MASS' },
  'Union':              { id: null,  color: '#800020', abbr: 'UNON', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Circle_U_Hockey.png' },
  'USC':                { id: 30,    color: '#990000', abbr: 'USC' },
  'Vanderbilt':         { id: 238,   color: '#866D4B', abbr: 'VAN' },
  'Villanova':          { id: 222,   color: '#00205B', abbr: 'NOVA' },
  'Virginia':           { id: 258,   color: '#232D4B', abbr: 'UVA', darkLogo: true },
  'Wake Forest':        { id: 154,   color: '#9E7E38', abbr: 'WAKE', darkLogo: true },
  'Washington':         { id: 264,   color: '#4B2E83', abbr: 'WASH' },
  'Wisconsin':          { id: 275,   color: '#C5050C', abbr: 'WIS' },
  'Yale':               { id: 43,    color: '#00356B', abbr: 'YALE' },
  'Portland':           { id: 2501,  color: '#461D7C', abbr: 'PORT' },
  // --- Cross country additions ---
  'Iowa State':         { id: 66,    color: '#A71930', abbr: 'ISU' },
  'Oregon':             { id: 2483,  color: '#154733', abbr: 'ORE' },
  'Northern Arizona':   { id: 2464,  color: '#003466', abbr: 'NAU', invertLogo: true, logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Northern_Arizona_Athletics_logo.svg' },
  'BYU':                { id: 252,   color: '#002E5D', abbr: 'BYU' },
  // --- Field hockey / W ice hockey additions ---
  'Old Dominion':       { id: 295,   color: '#003057', abbr: 'ODU' },
  'Clarkson':           { id: null,  color: '#006633', abbr: 'CLAR', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/6/63/Clarkson_Golden_Knights.svg' },
  'Northeastern':       { id: 111,   color: '#CC0000', abbr: 'NEU' },
  'Delaware':           { id: 48,    color: '#00539F', abbr: 'DEL' },
  // --- Gymnastics / tennis additions ---
  'Utah':               { id: 254,   color: '#CC0000', abbr: 'UTAH' },
  'Illinois':           { id: 356,   color: '#E84A27', abbr: 'ILL' },
  'TCU':                { id: 2628,  color: '#4D1979', abbr: 'TCU' },
  // --- Golf additions ---
  'Augusta State':      { id: null,  color: '#003087', abbr: 'AUG', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Augusta_Jaguars_logo.svg' },
  // --- W cross country additions ---
  'NC State':           { id: 152,   color: '#CC0000', abbr: 'NCST' },
  'New Mexico':         { id: 167,   color: '#BA0C2F', abbr: 'UNM' },
  // --- Wikipedia-scraped additions ---
  'Cornell':            { id: 172,   color: '#B31B1B', abbr: 'COR' },
  'Harvard':            { id: 108,   color: '#990000', abbr: 'HARV' },
  'Vermont':            { id: 261,   color: '#154734', abbr: 'UVM' },
  'Western Michigan':   { id: 2711,  color: '#532E1F', abbr: 'WMU' },
  'Georgia Tech':       { id: 59,    color: '#B3A369', abbr: 'GT' },
  'San Jose State':     { id: 23,    color: '#0038A8', abbr: 'SJSU' },
  // --- Water polo / volleyball / track & field additions ---
  "Hawai'i":            { id: 62,    color: '#024731', abbr: 'HAW' },
  'UC Irvine':          { id: 300,   color: '#002B5C', abbr: 'UCI' },
  'Loyola Chicago':     { id: 2350,  color: '#9D1244', abbr: 'LUC' },
  'George Mason':       { id: 2244,  color: '#016600', abbr: 'GMU' },
  'Lewis':              { id: null,  color: '#B80000', abbr: 'LEW', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Lewis_Flyers_2023_logo.svg' },
};

export const CHAMPIONSHIPS = {
  football: scraped.football || {},
  mbb: scraped.mbb || {},
  wbb: scraped.wbb || {},
  baseball: scraped.baseball || {},
  softball: scraped.softball || {},
  mvb: scraped.mvb || {},
  wvb: scraped.wvb || {},
  mih: scraped.mih || {},
  msoc: scraped.msoc || {},
  wsoc: scraped.wsoc || {},
  mlax: scraped.mlax || {},
  wlax: scraped.wlax || {},
  wfh: scraped.wfh || {},
  wih: scraped.wih || {},
  wgym: scraped.wgym || {},
  mten: scraped.mten || {},
  wten: scraped.wten || {},
  mgolf: scraped.mgolf || {},
  wgolf: scraped.wgolf || {},
  mswim: scraped.mswim || {},
  wswim: scraped.wswim || {},
  mwp: scraped.mwp || {},
  wwp: scraped.wwp || {},
  wrestling: scraped.wrestling || {},
  mxc: scraped.mxc || {},
  wxc: scraped.wxc || {},
  mitf: scraped.mitf || {},
  witf: scraped.witf || {},
  motf: scraped.motf || {},
  wotf: scraped.wotf || {},
};

// Compute the full year range from data
const allYears = new Set();
for (const sport of SPORTS) {
  const data = CHAMPIONSHIPS[sport.key];
  if (data) Object.keys(data).forEach(y => allYears.add(Number(y)));
}
export const YEARS = [...allYears].sort((a, b) => a - b);

export function getLogoUrl(schoolName) {
  const school = SCHOOLS[schoolName];
  if (!school) return null;
  if (school.logoUrl) return school.logoUrl;
  if (!school.id) return null;
  // ESPN publishes an inverted "dark" variant for some teams — used for
  // schools whose primary logo is too dark to read on our #0c0f14 canvas.
  const variant = school.darkLogo ? '500-dark' : '500';
  return `https://a.espncdn.com/i/teamlogos/ncaa/${variant}/${school.id}.png`;
}
