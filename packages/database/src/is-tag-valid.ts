import { type Transaction } from 'kysely';
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
  // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
  return Promise.resolve(true);
  // Disabled until the database is revitalized
  // const sanitizedName = tag.name.replaceAll(/[^\da-z]/gi, '');
  // const primaryTag = await transaction
  //   .selectFrom('Tag')
  //   .innerJoin('AlbumTag', 'Tag.name', 'AlbumTag.tagName')
  //   .innerJoin('Album', (join) =>
  //     join
  //       .onRef('Album.artist', '=', 'AlbumTag.albumArtist')
  //       .onRef('Album.name', '=', 'AlbumTag.albumName'),
  //   )
  //   // The Regex Filter
  //   .where(
  //     sql`REGEXP_REPLACE("Tag"."name", '[^[:alnum:]]', '', 'g')`,
  //     '=',
  //     sanitizedName,
  //   )
  //   .where('Album.hidden', 'is not', true)
  //   .where('Album.playcount', 'is not', null)
  //   .where('Album.listeners', 'is not', null)
  //   .groupBy('Tag.name')
  //   .select('Tag.name')
  //   // Order by the complex weight calculation directly
  //   .orderBy(
  //     sql`SUM(
  //     "AlbumTag"."count" :: FLOAT / 100
  //     * "Album"."playcount" / 1000
  //     * "Album"."listeners"
  //   )`,
  //     'desc',
  //   )
  //   .limit(1)
  //   .executeTakeFirst();
  // return !primaryTag || primaryTag.name === tag.name;
}
