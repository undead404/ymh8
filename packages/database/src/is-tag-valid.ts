import SQL from '@nearform/sql';

import { type BareTag, bareTagSchema } from '@ymh8/schemata';

import Database from './index.js';
import isTagBlacklisted from './is-tag-blacklisted.js';

export default async function isTagValid(
  database: Database,
  tag: BareTag,
): Promise<boolean> {
  if (isTagBlacklisted(tag.name)) {
    return false;
  }
  const sql = SQL`
    SELECT "weighted_tags"."name" AS "name"
    FROM (
        SELECT
            "Tag"."name",
            SUM(
            "AlbumTag"."count" :: FLOAT / 100 * COALESCE("Album"."playcount", 0) / 1000 * COALESCE("Album"."listeners", 0)
            ) AS "weight"
        FROM "Tag"
        JOIN "AlbumTag" ON "AlbumTag"."tagName" = "Tag"."name"
        JOIN "Album" ON "Album"."artist" = "AlbumTag"."albumArtist"
        AND "Album"."name" = "AlbumTag"."albumName"
        WHERE
            REGEXP_REPLACE("Tag"."name", '[^[:alnum:]]', '', 'g') = ${tag.name.replaceAll(
              /[^\da-z]/gi,
              '',
            )}
        AND "Album"."hidden" IS NOT TRUE
        GROUP BY "Tag"."name"
        ORDER BY "weight" DESC
    ) AS "weighted_tags"
    LIMIT 1
  `;
  const primaryTag = await database.queryOne(bareTagSchema, sql);
  return !primaryTag || primaryTag.name === tag.name;
}
