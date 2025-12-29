import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function saveCheckSuccess(
  transaction: Transaction<DB>,
  album: BareAlbum,
) {
  return transaction
    .updateTable('Album')
    .where('Album.artist', '=', album.artist)
    .where('Album.name', '=', album.name)
    .set({
      itunesCheckedAt: 'NOW()',
    })
    .execute();
}
