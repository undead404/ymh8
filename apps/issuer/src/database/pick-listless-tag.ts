import { type BareTag, bareTagSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countListlessTags(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NOT NULL
    AND "listCheckedAt" IS NOT NULL
    AND "listCheckedAt" < (NOW() - interval '1 month')
    AND "listUpdatedAt" IS NULL
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}

export default function pickListlessTag(): Promise<null | BareTag> {
  const sql = `
    SELECT "Tag"."name", COUNT(*) AS "albumCount"
    FROM "Tag"
    INNER JOIN "AlbumTag"
    ON "Tag"."name" = "AlbumTag"."tagName"
    INNER JOIN "Album"
    ON "AlbumTag"."albumArtist" = "Album"."artist"
    AND "AlbumTag"."albumName" = "Album"."name"
    WHERE "Album"."hidden" IS NOT TRUE
    AND "Tag"."listUpdatedAt" IS NULL
    AND "Tag"."albumsScrapedAt" IS NOT NULL
    GROUP BY "Tag"."name"
    ORDER BY "albumCount" DESC
    LIMIT 1
  `;
  return database.queryOne(bareTagSchema, sql);
}
