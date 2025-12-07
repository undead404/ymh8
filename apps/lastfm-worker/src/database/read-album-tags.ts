import SQL from '@nearform/sql';
import * as v from 'valibot';

import {
  type BareAlbum,
  nonEmptyString,
  positivePercentage,
} from '@ymh8/schemata';

import database from './index.js';

const albumTagReturnSchema = v.object({
  count: positivePercentage,
  tagName: nonEmptyString,
});

type AlbumTag = v.InferInput<typeof albumTagReturnSchema>;

export default async function readAlbumTags({
  artist,
  name,
}: BareAlbum): Promise<AlbumTag[]> {
  const sql = SQL`
        SELECT "count", "tagName"
        FROM "AlbumTag"
        WHERE "albumArtist" = ${artist}
        AND "albumName" = ${name}
    `;
  const data = await database.queryMany(albumTagReturnSchema, sql);
  return data;
}
