import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getListlessTags(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Tag')
    .innerJoin('AlbumTag', 'Tag.name', 'AlbumTag.tagName')
    .innerJoin('Album', (join) =>
      join
        .onRef('AlbumTag.albumArtist', '=', 'Album.artist')
        .onRef('AlbumTag.albumName', '=', 'Album.name'),
    )
    .where('Album.hidden', 'is not', true)
    .where('Tag.listUpdatedAt', 'is', null)
    .where('Tag.albumsScrapedAt', 'is not', null)
    .groupBy('Tag.name')
    .select(['Tag.name', sql<number>`COUNT(*)`.as('albumCount')])
    .having(sql<boolean>`COUNT(*) >= ${100}`) // <-- filter groups with albumCount >= 100
    .orderBy('albumCount', 'desc')
    .limit(limit)
    .execute();
}
