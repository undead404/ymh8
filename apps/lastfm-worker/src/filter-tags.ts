import { readFile } from 'node:fs/promises';
const blacklistedData = await readFile('./blacklisted-tags.txt');

const BLACKLISTED_TAGS = new Set(blacklistedData.toString().split('\n'));

const BLACKLISTED_TAG_STARTS = [
  ' ',
  '-',
  '00s ',
  '10s ',
  '19th century ',
  '1st ',
  '2010s ',
  '2015 ',
  '2016 ',
  '2017 ',
  '20s ',
  '20th century ',
  '30s ',
  '40s ',
  '50s ',
  '60s ',
  '70s ',
  '80s ',
  '90s ',
  'album of ',
  'albums ',
  'albuns ',
  'all time favorite ',
  'altar of the metal gods',
  'anal ',
  'approved by',
  'argeu',
  'awesome ',
  'bbc ',
  'best ',
  'better than ',
  'brc blues band ',
  'c20 ',
  'cd ',
  'cds ',
  'cmj',
  'conforms to ',
  'excellent',
  'exists ',
  'fart',
  'favorite',
  'favourite',
  'for ',
  'free ',
  'from ',
  'fuck ',
  'fuckin ',
  'fucking ',
  'general ',
  'good ',
  'harukaex',
  'i ',
  'incest',
  'intrumental',
  'jpoptrasher',
  'killer ',
  'listen to ',
  'lounge at ',
  'lyrics ',
  'meine ',
  'music from ',
  'music i ',
  'music to ',
  'musica ',
  'my ',
  'nice ',
  'not ',
  'perfect',
  'playlist',
  'post-post-',
  'purchased',
  'radio ',
  'records ',
  'shit ',
  'sick ',
  'similar to ',
  'stand out ',
  'streamable',
  'the best ',
  'thebest',
  'title is ',
  'to jest ',
  'too much',
  'top ',
  'ugly ',
  'under the radar',
  'valkyeriex',
  'valkyreiex',
  'valkyriex',
  'without ',
  'wiz khalifa',
  'worse than ',
  'worst ',
  'you can listen ',
];

const BLACKLISTED_TAG_ENDS = [
  ' 2016',
  ' 2020',
  ' 60s',
  ' aesthetics',
  ' af',
  ' album',
  ' album cover',
  ' album covers',
  ' albums',
  ' artist',
  ' artists',
  ' as fuck',
  ' brilliance',
  ' classics',
  ' collection',
  ' concerto',
  ' does not approve',
  ' etc',
  ' fathers',
  ' favorites',
  ' favourites',
  ' flavoured',
  ' gods',
  ' group',
  ' groups',
  ' i own',
  ' influence',
  ' influences',
  ' instrument',
  ' like this',
  ' likes this album',
  ' lovers',
  ' lyrics',
  ' minutes',
  ' music',
  ' musician',
  ' musicians',
  ' my ass',
  ' of the 21st century',
  ' on cover',
  ' owns',
  ' owns this',
  ' performance',
  ' productions',
  ' ram',
  ' radiostation',
  ' rare',
  ' recommends',
  ' records',
  ' releases',
  ' selection',
  ' song',
  ' songs',
  ' soundtrack',
  ' stars',
  ' streamable',
  ' tag',
  ' to hear before you die',
  ' vibe',
  ' vibes',
  '-esque',
  '-inch',
  '-y',
  'buttcore',
  'cunt',
  'fanatics',
  'fecalomatateus',
  'fm',
  'genius',
  'kircore',
  'owner',
  'peniscore',
  'radio',
  'recs',
  'rpm',
  'scum',
  'scumcore',
  'sexy sounding',
  'shit',
];

const BLACKLISTED_SUBSTRINGS = [' - ', '  ', 'lastfm'];

const MIN_TAG_NAME_LENGTH = 2;
const MAX_TAG_NAME_LENGTH = 40;
const TAG_RE = /^\w[-\d A-Z_]*[a-z][-\w ]*\w$/;

function isTagBlacklisted(tagName: string) {
  let result = false;

  if (tagName.length < MIN_TAG_NAME_LENGTH) {
    result = true;
  } else if (tagName.length > MAX_TAG_NAME_LENGTH) {
    result = true;
  } else if (!TAG_RE.test(tagName)) {
    return true;
  } else if (BLACKLISTED_TAGS.has(tagName)) {
    result = true;
  } else if (
    BLACKLISTED_TAG_STARTS.some((blacklistedTagStart) =>
      tagName.startsWith(blacklistedTagStart),
    )
  ) {
    result = true;
  } else if (
    BLACKLISTED_TAG_ENDS.some((blacklistedTagEnd) =>
      tagName.endsWith(blacklistedTagEnd),
    )
  ) {
    result = true;
  } else if (
    BLACKLISTED_SUBSTRINGS.some((blacklistedSubstring) =>
      tagName.includes(blacklistedSubstring),
    )
  ) {
    result = true;
  }

  return result;
}

export default function filterTags<T extends { name: string }>(tags: T[]): T[] {
  return tags.filter((tag) => !isTagBlacklisted(tag.name.toLowerCase()));
}
