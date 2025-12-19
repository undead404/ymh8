import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function readAlbumTags(
  transaction: Transaction<DB>,
  album: BareAlbum,
) {
  return transaction
    .selectFrom('AlbumTag')
    .select(['count', 'tagName'])
    .where('albumArtist', '=', album.artist)
    .where('albumName', '=', album.name)
    .execute();
}
