import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countOldTagsAlbums(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Album"
    WHERE "hidden" IS NOT TRUE
    AND "tagsUpdatedAt" < (NOW() - interval '1 month')
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}
export default function findOldTagsBareAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT "artist", "name"
    FROM "Album"
    WHERE "hidden" IS NOT TRUE
    AND "tagsUpdatedAt" < (NOW() - interval '1 month')
    ORDER BY "tagsUpdatedAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
