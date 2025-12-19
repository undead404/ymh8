import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countOldStatsAlbums(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Album"
    WHERE "hidden" IS NOT TRUE
    AND "statsUpdatedAt" < (NOW() - interval '1 month')
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}

export default function findOldStatsBareAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT "artist", "name"
    FROM "Album"
    WHERE "hidden" IS NOT TRUE
    AND "statsUpdatedAt" < (NOW() - interval '1 month')
    ORDER BY "statsUpdatedAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
