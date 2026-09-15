import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';
import calculateNextUpdateDate from '../utils/calculate-next-update-date.js';

import type { AlbumDetails } from './get-album-details.js';

export default function saveAlbumTagsUpdateSuccess(
  transaction: Transaction<DB>,
  album: BareAlbum & AlbumDetails,
  { listeners, playcount }: { listeners: number; playcount: number },
) {
  const nextUpdateDate = calculateNextUpdateDate(album.date, {
    listeners,
    playcount,
  });
  return transaction
    .updateTable('Album')
    .set({
      nextTagsUpdateAt: nextUpdateDate,
      tagsUpdatedAt: sql<Date>`NOW()`,
    })
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .execute();
}
