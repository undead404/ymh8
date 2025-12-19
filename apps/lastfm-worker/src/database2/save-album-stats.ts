import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function saveAlbumStats(
  transaction: Transaction<DB>,
  album: BareAlbum,
  { listeners, playcount }: { listeners: number; playcount: number },
) {
  return transaction
    .updateTable('Album')
    .set({
      listeners,
      playcount,
      statsUpdatedAt: 'NOW()',
    })
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .execute();
}
