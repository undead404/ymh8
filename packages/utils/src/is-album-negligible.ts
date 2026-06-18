import type { BareAlbum } from '@ymh8/schemata';

const NEGLIGIBLE_ALBUM_NAME_REGEXES = [
  'ClearMusicDownloader',
  'undefined',
  '[non-album tracks]',
  /\s$/,
  /^\s/,
  /\s{2,}/,
  /bootleg/i,
  /cd\d/i,
  /[[(]?(?:dis(?:c|k)|cd) \d/i,
  /[[(]bonus[[()\]]$/i,
  /[[(]?bonus (?:tracks?|dis(?:c|k))[)\]]?$/i,
];

/**
 *
 * @param album
 * @returns Whether the album's name contains any signs of obvious garbage to remove from the charts
 */
export default function isAlbumNegligible(album: BareAlbum) {
  if (album.artist === '[unknown]') {
    return true;
  }
  for (const regex of NEGLIGIBLE_ALBUM_NAME_REGEXES) {
    if (typeof regex === 'string') {
      if (album.name === regex) {
        return true;
      }
    } else {
      if (regex.test(album.name)) {
        return true;
      }
    }
  }
  return false;
}
