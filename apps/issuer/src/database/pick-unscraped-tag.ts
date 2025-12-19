import { type BareTag, bareTagSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countOldTagLists(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NULL
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}
export default function pickUnscrapedTag(): Promise<null | BareTag> {
  const sql = `
    SELECT "Tag"."name",
        SUM(
            "Album"."playcount"::FLOAT / 1000 * "AlbumTag"."count" / 100 * "Album"."listeners"
        ) AS "weight"
    FROM "Tag"
    INNER JOIN "AlbumTag"
    ON "Tag"."name" = "AlbumTag"."tagName"
    INNER JOIN "Album"
    ON "AlbumTag"."albumArtist" = "Album"."artist"
    AND "AlbumTag"."albumName" = "Album"."name"
    WHERE "albumsScrapedAt" IS NULL
    AND "Album"."playcount" IS NOT NULL
    AND "Album"."listeners" IS NOT NULL
    AND "Album"."hidden" IS NOT TRUE
    GROUP BY "Tag"."name"
    ORDER BY "weight" DESC
    LIMIT 1
  `;
  return database.queryOne(bareTagSchema, sql);
}
