import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function saveAlbumStatsAndNumberOfTracks(
  transaction: Transaction<DB>,
  album: BareAlbum,
  {
    listeners,
    numberOfTracks,
    playcount,
  }: {
    listeners: number;
    numberOfTracks: number;
    playcount: number;
  },
) {
  return transaction
    .updateTable('Album')
    .set({
      listeners,
      numberOfTracks,
      playcount,
      statsUpdatedAt: 'NOW()',
    })
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .execute();
}
