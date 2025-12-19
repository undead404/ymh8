import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type convertAlbum from '../utils/convert-album.js';

export default function insertNewAlbums(
  transaction: Transaction<DB>,
  newAlbums: (ReturnType<typeof convertAlbum> & { hidden: boolean })[],
) {
  return transaction
    .insertInto('Album')
    .values(
      newAlbums.map((album) => ({
        artist: album.artist,
        cover: album.cover ?? null,
        hidden: album.hidden,
        name: album.name,
        thumbnail: album.thumbnail ?? null,
      })),
    )
    .execute();
}
