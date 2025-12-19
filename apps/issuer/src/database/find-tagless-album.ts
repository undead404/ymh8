import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countTaglessAlbums(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Album"
    WHERE "tagsUpdatedAt" IS NULL
    AND "hidden" IS NOT TRUE
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}

export default function findTaglessAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT
      "artist",
      "name",
      COALESCE("playcount", 0)::FLOAT / 1000.0 * COALESCE("listeners", 0) AS "weight"
    FROM "Album"
    WHERE "tagsUpdatedAt" IS NULL
    AND "hidden" IS NOT TRUE
    ORDER BY
		"weight" DESC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
