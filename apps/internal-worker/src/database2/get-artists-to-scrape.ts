import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getArtistsToScrape(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Artist')
    .leftJoin('Album', 'Album.artist', 'Artist.name')
    .select(['Artist.name'])
    .where('Artist.name', '<>', 'Various Artists')
    .where('Artist.name', '<>', 'Varios Artistas')
    .where((eb) =>
      eb.or([
        eb('Artist.albumsScrapedAt', 'is', null),
        eb(
          'Artist.albumsScrapedAt',
          '<',
          sql<Date>`NOW() - interval '3 months'`,
        ),
      ]),
    )
    .groupBy(['Artist.name', 'Artist.albumsScrapedAt'])
    .orderBy(sql`COALESCE(SUM("Album"."listeners"), 0)`, 'desc')
    .orderBy(sql`"Artist"."albumsScrapedAt" asc nulls first`)
    .orderBy('Artist.name', 'asc')
    .limit(limit)
    .execute();
}
