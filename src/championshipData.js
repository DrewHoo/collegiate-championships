// NCAA Division I National Championship Data
// Sources: NCAA records, AP polls (football pre-CFP era), plus GitHub-hosted datasets
// (see scripts/fetch-data.mjs for the scraper that populates the .scraped.json).
// Year convention: football = fall season year; all other sports = tournament/championship year

import scraped from './championshipData.scraped.json';
import monoLogos from './monoLogos.json';

// Each sport has:
//   key       — referenced throughout the app
//   name      — full display name (shown in tooltips and the info bar)
//   short     — short code (currently unused; reserved for compact layouts)
//   icon      — basename of an SVG in src/icons/ (Fluent Emoji High
//               Contrast, MIT — the only monochrome set with real lacrosse
//               and field hockey glyphs; license alongside the files).
//               Rendered as a CSS mask so it wears the theme's ink color.
//   tag       — tiny text tag under the icon for the three running sports,
//               which share one runner glyph: a shoe-vs-arena distinction
//               nobody can decode at 16px, but XC/IN/OUT reads.
//   gender    — "♂" or "♀" glyph rendered beneath the icon. Set on
//               every sport (including single-gender sports) so the
//               header layout is consistent across all columns.
export const SPORTS = [
  { key: 'football',  name: 'Football',                     short: 'FB',  icon: 'football',        gender: '♂' },
  { key: 'mbb',       name: "Men's Basketball",             short: 'MBK', icon: 'basketball',      gender: '♂' },
  { key: 'wbb',       name: "Women's Basketball",           short: 'WBK', icon: 'basketball',      gender: '♀' },
  { key: 'baseball',  name: 'Baseball',                     short: 'BSB', icon: 'baseball',        gender: '♂' },
  { key: 'softball',  name: 'Softball',                     short: 'SB',  icon: 'softball',        gender: '♀' },
  { key: 'mvb',       name: "Men's Volleyball",             short: 'MVB', icon: 'volleyball',      gender: '♂' },
  { key: 'wvb',       name: "Women's Volleyball",           short: 'WVB', icon: 'volleyball',      gender: '♀' },
  { key: 'mih',       name: "Men's Ice Hockey",             short: 'MIH', icon: 'ice-hockey',      gender: '♂' },
  { key: 'wih',       name: "Women's Ice Hockey",           short: 'WIH', icon: 'ice-hockey',      gender: '♀' },
  { key: 'msoc',      name: "Men's Soccer",                 short: 'MSO', icon: 'soccer',          gender: '♂' },
  { key: 'wsoc',      name: "Women's Soccer",               short: 'WSO', icon: 'soccer',          gender: '♀' },
  { key: 'mlax',      name: "Men's Lacrosse",               short: 'MLX', icon: 'lacrosse',        gender: '♂' },
  { key: 'wlax',      name: "Women's Lacrosse",             short: 'WLX', icon: 'lacrosse',        gender: '♀' },
  { key: 'wfh',       name: "Women's Field Hockey",         short: 'WFH', icon: 'field-hockey',    gender: '♀' },
  { key: 'wgym',      name: "Women's Gymnastics",           short: 'WGY', icon: 'gymnastics',      gender: '♀' },
  { key: 'mten',      name: "Men's Tennis",                 short: 'MTN', icon: 'tennis',          gender: '♂' },
  { key: 'wten',      name: "Women's Tennis",               short: 'WTN', icon: 'tennis',          gender: '♀' },
  { key: 'mgolf',     name: "Men's Golf",                   short: 'MGF', icon: 'golf',            gender: '♂' },
  { key: 'wgolf',     name: "Women's Golf",                 short: 'WGF', icon: 'golf',            gender: '♀' },
  { key: 'mswim',     name: "Men's Swimming & Diving",      short: 'MSW', icon: 'swimming-diving', gender: '♂' },
  { key: 'wswim',     name: "Women's Swimming & Diving",    short: 'WSW', icon: 'swimming-diving', gender: '♀' },
  { key: 'mwp',       name: "Men's Water Polo",             short: 'MWP', icon: 'water-polo',      gender: '♂' },
  { key: 'wwp',       name: "Women's Water Polo",           short: 'WWP', icon: 'water-polo',      gender: '♀' },
  { key: 'wrestling', name: 'Wrestling',                    short: 'WRS', icon: 'wrestling',       gender: '♂' },
  { key: 'wwr',       name: "Women's Wrestling",            short: 'WWR', icon: 'wrestling',       gender: '♀' },
  { key: 'wrow',      name: "Women's Rowing",               short: 'WRO', icon: 'rowing',          gender: '♀' },
  { key: 'mgym',      name: "Men's Gymnastics",             short: 'MGY', icon: 'gymnastics',      gender: '♂' },
  { key: 'mxc',       name: "Men's Cross Country",          short: 'MXC', icon: 'running', tag: 'XC',  gender: '♂' },
  { key: 'wxc',       name: "Women's Cross Country",        short: 'WXC', icon: 'running', tag: 'XC',  gender: '♀' },
  { key: 'mitf',      name: "Men's Indoor Track & Field",   short: 'MIT', icon: 'running', tag: 'IN',  gender: '♂' },
  { key: 'witf',      name: "Women's Indoor Track & Field", short: 'WIT', icon: 'running', tag: 'IN',  gender: '♀' },
  { key: 'motf',      name: "Men's Outdoor Track & Field",  short: 'MOT', icon: 'running', tag: 'OUT', gender: '♂' },
  { key: 'wotf',      name: "Women's Outdoor Track & Field",short: 'WOT', icon: 'running', tag: 'OUT', gender: '♀' },
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
  // --- Rowing / men's gymnastics / women's wrestling additions ---
  'Brown':              { id: 225,   color: '#4E3629', abbr: 'BRWN' },
  'Southern Illinois':  { id: 79,    color: '#720000', abbr: 'SIU' },
  'Indiana State':      { id: 282,   color: '#00669A', abbr: 'INST' },
  'McKendree':          { id: 2816,  color: '#4F2D7F', abbr: 'MCK' },
  // --- 1972–1989 backfill additions ---
  'Bowling Green':      { id: 189,   color: '#FE5000', abbr: 'BGSU' },
  'Hartwick':           { id: null,  color: '#005EB8', abbr: 'HART', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Hartwick_hawks_logo.png' },
  'Houston':            { id: 248,   color: '#C8102E', abbr: 'HOU' },
  'Howard':             { id: 47,    color: '#003A63', abbr: 'HOW' },
  'Louisiana Tech':     { id: 2348,  color: '#003087', abbr: 'LT' },
  'Manhattan':          { id: 2363,  color: '#4F8537', abbr: 'MAN' },
  'Marquette':          { id: 269,   color: '#003366', abbr: 'MARQ' },
  'Michigan Tech':      { id: 2392,  color: '#FFCD00', abbr: 'MTU' },
  'New Hampshire':      { id: 160,   color: '#003591', abbr: 'UNH' },
  'Pacific':            { id: 279,   color: '#F47820', abbr: 'PAC' },
  'Pittsburgh':         { id: 221,   color: '#003594', abbr: 'PITT' },
  'Rensselaer':         { id: 2528,  color: '#D6001C', abbr: 'RPI' },
  'Saint Louis':        { id: 139,   color: '#00539C', abbr: 'SLU' },
  'San Diego State':    { id: 21,    color: '#A6192E', abbr: 'SDSU' },
  'San Francisco':      { id: 2539,  color: '#00543C', abbr: 'SF' },
  'SIU Edwardsville':   { id: 2565,  color: '#E4002B', abbr: 'SIUE' },
  'SMU':                { id: 2567,  color: '#C8102E', abbr: 'SMU' },
  'Temple':             { id: 218,   color: '#A41E35', abbr: 'TEM' },
  'Trinity (TX)':       { id: null,  color: '#862633', abbr: 'TRIN', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f1/Trinity_Tigers_logo.svg' },
  'Tulsa':              { id: 202,   color: '#003595', abbr: 'TLSA' },
  'UTEP':               { id: 2638,  color: '#FF8200', abbr: 'UTEP' },
  'Washington State':   { id: 265,   color: '#A60F2D', abbr: 'WSU' },
  'Wichita State':      { id: 2724,  color: '#FFCD00', abbr: 'WICH', darkLogo: true },
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
  wrow: scraped.wrow || {},
  mgym: scraped.mgym || {},
  // Women's wrestling became the NCAA's 91st championship in March 2026
  // (National Collegiate; McKendree over Iowa, 171–166). Wikipedia has no
  // year-by-year champions table yet — memory entry until one exists, then
  // a scraper source supersedes it.
  wwr: {
    2026: 'McKendree',
  },
  wotf: {
    ...(scraped.wotf || {}),
    // 2026: Wikipedia's year-by-year champions table lags, but the same
    // page's infobox ("Most recent champion: Georgia (2nd)") and its
    // championships-by-team table ("Georgia — 2025, 2026") both confirm
    // the winner. Memory override until the table catches up; a future
    // scrape will supersede it (scraped values win on overlap).
    2026: 'Georgia',
  },
};

// Compute the full year range from data
const allYears = new Set();
for (const sport of SPORTS) {
  const data = CHAMPIONSHIPS[sport.key];
  if (data) Object.keys(data).forEach(y => allYears.add(Number(y)));
}
export const YEARS = [...allYears].sort((a, b) => a - b);

// One-color white "ink density" stamps baked by scripts/gen-mono-logos.mjs
// into public/logos/mono/. A CSS grayscale of the color logo keeps the
// original luminance (navy marks stay near-invisible on the dark canvas);
// the baked stamp is solidly white with alpha carrying the mark's structure.
const MONO = new Set(monoLogos);
export function getMonoLogoUrl(schoolName) {
  const slug = schoolName.replace(/\W+/g, '');
  if (!MONO.has(slug)) return null;
  return `${import.meta.env.BASE_URL}logos/mono/${slug}.png`;
}

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
