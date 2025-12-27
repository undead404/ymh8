import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default async function readAlbumStats(
  transaction: Transaction<DB>,
  { artist, name }: BareAlbum,
) {
  const data = await transaction
    .selectFrom('Album')
    .select(['listeners', 'numberOfTracks', 'playcount'])
    .where('artist', '=', artist)
    .where('name', '=', name)
    .executeTakeFirstOrThrow();

  return data;
}
