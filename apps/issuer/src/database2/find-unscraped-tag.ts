import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findUnscrapedTag(transaction: Transaction<DB>) {
  return transaction
    .selectFrom('Tag')
    .innerJoin('AlbumTag', 'Tag.name', 'AlbumTag.tagName')
    .innerJoin('Album', (join) =>
      join
        .onRef('AlbumTag.albumArtist', '=', 'Album.artist')
        .onRef('AlbumTag.albumName', '=', 'Album.name'),
    )
    .select([
      'Tag.name',
      sql<number>`SUM(
            "Album"."playcount"::FLOAT / 1000 * "AlbumTag"."count" / 100 * "Album"."listeners"
        )`.as('weight'),
    ])
    .where('Tag.albumsScrapedAt', 'is', null)
    .where('Album.hidden', 'is not', true)
    .where('Album.listeners', 'is not', null)
    .where('Album.playcount', 'is not', null)
    .groupBy('Tag.name')
    .orderBy('weight', 'desc')
    .limit(1)
    .executeTakeFirst();
}
