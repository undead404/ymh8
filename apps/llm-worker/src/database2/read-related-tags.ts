import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function readRelatedTags(
  transaction: Transaction<DB>,
  tagName: string,
  max: number,
) {
  return (
    transaction
      .selectFrom('Album')
      // Join 1: Find albums containing the source tag
      .innerJoin('AlbumTag as first_tag', (join) =>
        join
          .onRef('Album.artist', '=', 'first_tag.albumArtist')
          .onRef('Album.name', '=', 'first_tag.albumName'),
      )
      // Join 2: Find other tags on those same albums
      .leftJoin('AlbumTag as second_tag', (join) =>
        join
          .onRef('second_tag.albumArtist', '=', 'Album.artist')
          .onRef('second_tag.albumName', '=', 'Album.name'),
      )
      // Join 3: Get metadata for the second tag (to filter by listUpdatedAt)
      .leftJoin(
        'Tag as second_tag_tag',
        'second_tag_tag.name',
        'second_tag.tagName',
      )
      // Filtering
      .where('first_tag.tagName', '=', tagName)
      .where('second_tag_tag.listUpdatedAt', 'is not', null)
      .where('second_tag_tag.name', '<>', tagName) // Exclude self
      .groupBy('second_tag.tagName')
      .select([
        'second_tag.tagName as name',
        // Complex intersection weight calculation
        sql<number>`SUM(
        LEAST("first_tag"."count", "second_tag"."count")::NUMERIC
        * COALESCE("Album"."listeners", 0)
      )`.as('weight'),
      ])
      .orderBy('weight', 'desc')
      .limit(max)
      .execute()
  );
}
