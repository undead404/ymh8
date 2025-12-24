import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

// const numberOfTracksReturnSchema = v.object({
//   numberOfTracks: v.nullable(v.number()),
// });

export default async function readAlbumNumberOfTracks(
  transaction: Transaction<DB>,
  { artist, name }: BareAlbum,
): Promise<number | null> {
  const data = await transaction
    .selectFrom('Album')
    .select(['numberOfTracks'])
    .where('artist', '=', artist)
    .where('name', '=', name)
    .executeTakeFirst();
  if (!data) {
    throw new Error('Album numberOfTracks not found');
  }
  return data.numberOfTracks;
}
