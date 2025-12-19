import type { BareAlbum } from '@ymh8/schemata';

const NEGLIGIBLE_ALBUM_NAME_REGEXES = [
  'ClearMusicDownloader',
  'undefined',
  /\s$/,
  /^\s/,
  /\s{2,}/,
  /bootleg/i,
  /cd\d/i,
  /[[(]?(?:dis(?:c|k)|cd) \d/i,
  /[[(]bonus[[()\]]$/i,
  /[[(]?bonus (?:tracks?|dis(?:c|k))[)\]]?$/i,
];

export default function isAlbumNegligible(album: BareAlbum) {
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
