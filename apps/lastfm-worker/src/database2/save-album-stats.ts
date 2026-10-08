import { type ExpressionBuilder, sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';
import calculateNextUpdateDate from '../utils/calculate-next-update-date.js';

import type { AlbumDetails } from './get-album-details.js';
import isAlbumHidden from './is-album-hidden.js';

/**
 * Escapes PostgreSQL LIKE/ILIKE wildcards (%, _, and \) so they are treated as literal characters.
 */
function escapeLike(string_: string): string {
  return string_.replaceAll(/([%_\\])/g, String.raw`\$1`);
}

export default async function saveAlbumStats(
  transaction: Transaction<DB>,
  album: BareAlbum & AlbumDetails,
  {
    listeners,
    numberOfTracks,
    playcount,
  }: {
    listeners: number;
    numberOfTracks?: number | undefined;
    playcount: number;
  },
) {
  const nextUpdateDate = calculateNextUpdateDate(album.date, {
    listeners,
    playcount,
  });

  const safeArtist = escapeLike(album.artist);
  const safeName = escapeLike(album.name);

  // Helper filter for matching case-insensitive variants, excluding the target album record itself
  const isDuplicateVariant = (eb: ExpressionBuilder<DB, 'Album'>) =>
    eb.and([
      eb('artist', 'ilike', safeArtist),
      eb('name', 'ilike', safeName),
      eb.or([eb('artist', '!=', album.artist), eb('name', '!=', album.name)]),
    ]);

  const isHidden = await isAlbumHidden(transaction, album);
  let shouldUnhideTarget = false;

  if (isHidden) {
    // Check if there are any active (not hidden) matches with different casing
    const activeMatch = await transaction
      .selectFrom('Album')
      .select('artist')
      .where(isDuplicateVariant)
      .where('hidden', 'is not', true)
      .executeTakeFirst();

    if (activeMatch) {
      shouldUnhideTarget = true;

      // Hide all other ILIKE matches
      await transaction
        .updateTable('Album')
        .set({ hidden: true })
        .where(isDuplicateVariant)
        .execute();
    }
  } else {
    // The target album is not hidden, ensure all other variants are hidden
    await transaction
      .updateTable('Album')
      .set({ hidden: true })
      .where(isDuplicateVariant)
      .execute();
  }

  // Save the stats and conditionally apply hidden: false
  return transaction
    .updateTable('Album')
    .set({
      listeners,
      nextStatsUpdateAt: nextUpdateDate,
      ...(numberOfTracks ? { numberOfTracks } : {}),
      playcount,
      statsUpdatedAt: sql<Date>`NOW()`,
      ...(shouldUnhideTarget ? { hidden: false } : {}),
    })
    .where('artist', '=', album.artist)
    .where('name', '=', album.name)
    .execute();
}
