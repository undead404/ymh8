import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { type BareTag } from '@ymh8/schemata';

import blacklist from './utils/blacklist.js';

export default async function isTagValid(
  transaction: Transaction<DB>,
  tag: BareTag,
): Promise<boolean> {
  if (blacklist.isBlacklisted(tag.name)) {
    return false;
  }
  const sanitizedName = tag.name.replaceAll(/[^\da-z]/gi, '');
  const primaryTag = await transaction
    .selectFrom('Tag')
    .innerJoin('AlbumTag', 'Tag.name', 'AlbumTag.tagName')
    .innerJoin('Album', (join) =>
      join
        .onRef('Album.artist', '=', 'AlbumTag.albumArtist')
        .onRef('Album.name', '=', 'AlbumTag.albumName'),
    )
    // The Regex Filter
    .where(
      sql`REGEXP_REPLACE("Tag"."name", '[^[:alnum:]]', '', 'g')`,
      '=',
      sanitizedName,
    )
    .where('Album.hidden', 'is not', true)
    .groupBy('Tag.name')
    .select('Tag.name')
    // Order by the complex weight calculation directly
    .orderBy(
      sql`SUM(
      "AlbumTag"."count" :: FLOAT / 100 
      * COALESCE("Album"."playcount", 0) / 1000 
      * COALESCE("Album"."listeners", 0)
    )`,
      'desc',
    )
    .limit(1)
    .executeTakeFirst();
  return !primaryTag || primaryTag.name === tag.name;
}
