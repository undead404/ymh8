import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function hideAlbum(
  transaction: Transaction<DB>,
  album: BareAlbum,
) {
  return transaction
    .updateTable('Album')
    .set({ hidden: true })
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .execute();
}
