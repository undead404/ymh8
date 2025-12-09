import type { BareAlbum } from '@ymh8/schemata';

import isAlbumKnown from './is-album-known.js';

export async function filterNewAlbums<T extends BareAlbum>(
  albums: T[],
): Promise<T[]> {
  const newAlbums: T[] = [];
  for (const album of albums) {
    if (!(await isAlbumKnown(album))) {
      newAlbums.push(album);
    }
  }
  return newAlbums;
}
