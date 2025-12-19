import SQL from '@nearform/sql';

import {
  type BareArtist,
  bareArtistSchema,
  type BareTag,
} from '@ymh8/schemata';

import database from './index.js';

export default async function readTagArtists(
  tag: BareTag,
  max: number,
): Promise<BareArtist[]> {
  const sql = SQL`
    SELECT
        "Album"."artist" AS "name",
        SUM(COALESCE("Album"."listeners"::FLOAT, 0) / 100 * "AlbumTag"."count") AS "weight"
    FROM "Album"
    INNER JOIN "AlbumTag"
    ON "Album"."artist" = "AlbumTag"."albumArtist"
    AND "Album"."name" = "AlbumTag"."albumName"
    WHERE "AlbumTag"."tagName" = ${tag.name}
	AND "Album"."hidden" IS NOT TRUE
	AND "Album"."artist" <> 'Various Artists'
    GROUP BY "Album"."artist"
	ORDER BY "weight" DESC
    LIMIT ${max}
  `;
  const data = await database.queryMany(bareArtistSchema, sql);
  return data;
}
