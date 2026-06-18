import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getOldStatsListfulAlbums(transaction: Transaction<DB>) {
  return (
    transaction
      .selectFrom('TagListItem')
      .innerJoin('Album', (join) =>
        join
          .onRef('TagListItem.albumArtist', '=', 'Album.artist')
          .onRef('TagListItem.albumName', '=', 'Album.name'),
      )
      .where((eb) =>
        eb.or([
          // eb('Album.listeners', '=', 0),
          // eb('Album.playcount', '=', 0),
          eb('statsUpdatedAt', 'is', null),
          eb('statsUpdatedAt', '<', sql<Date>`NOW() - INTERVAL '3 months'`),
        ]),
      )
      .orderBy(sql<boolean>`"statsUpdatedAt" IS NULL DESC`)
      .orderBy('statsUpdatedAt', 'asc')
      // .where(sql`"statsUpdatedAt" < interval '1' month`)
      .select(['Album.artist', 'Album.name'])
      .execute()
  );
}
