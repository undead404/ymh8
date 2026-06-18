import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function getAlbumDetails(
  transaction: Transaction<DB>,
  album: BareAlbum,
) {
  return transaction
    .selectFrom('Album')
    .where('Album.artist', '=', album.artist)
    .where('Album.name', '=', album.name)
    .select(['Album.date', 'Album.numberOfTracks'])
    .executeTakeFirstOrThrow();
}
