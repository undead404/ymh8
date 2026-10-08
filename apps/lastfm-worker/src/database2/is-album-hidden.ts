import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default async function isAlbumHidden(
  transaction: Transaction<DB>,
  album: BareAlbum,
) {
  const result = await transaction
    .selectFrom('Album')
    .select(['hidden'])
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .limit(1)
    .executeTakeFirst();
  return !!result?.hidden;
}
