import type { BareArtist } from '@ymh8/schemata';

const NEGLIGIBLE_ARTIST_NAME_REGEXES = [
  '[unknown]',
  'undefined',
  /\s$/,
  /^\s/,
  /\s{2,}/,
];

/**
 * @param artist
 * @returns Whether the artist is an obvious placeholder to remove from the charts
 */
export default function isArtistNegligible(artist: BareArtist) {
  for (const regex of NEGLIGIBLE_ARTIST_NAME_REGEXES) {
    if (typeof regex === 'string') {
      if (artist.name === regex) return true;
    } else if (regex.test(artist.name)) {
      return true;
    }
  }
  return false;
}
