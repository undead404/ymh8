import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

import isAlbumKnown from './is-album-known.js';

export async function filterNewAlbums<T extends BareAlbum>(
  transaction: Transaction<DB>,
  albums: T[],
): Promise<T[]> {
  const newAlbums: T[] = [];
  for (const album of albums) {
    if (!(await isAlbumKnown(transaction, album))) {
      newAlbums.push(album);
    }
  }
  return newAlbums;
}
