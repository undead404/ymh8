import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { type BareArtist, type BareTag } from '@ymh8/schemata';

export default async function readTagArtists(
  transaction: Transaction<DB>,
  tag: BareTag,
  max: number,
): Promise<BareArtist[]> {
  return transaction
    .selectFrom('Album')
    .innerJoin('AlbumTag', 'Album.artist', 'AlbumTag.albumArtist')
    .where('AlbumTag.tagName', '=', tag.name)
    .where('Album.hidden', 'is not', true)
    .where('Album.artist', '<>', 'Various Artists')
    .groupBy('Album.artist')
    .select([
      'Album.artist as name',
      sql<number>`SUM(COALESCE("Album"."listeners"::NUMERIC, 0) / 100 * "AlbumTag"."count")`.as(
        'weight',
      ),
    ])
    .orderBy('weight', 'desc')
    .limit(max)
    .execute();
}
