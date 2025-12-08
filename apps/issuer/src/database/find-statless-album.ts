import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countStatlessAlbums(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Album"
    WHERE "statsUpdatedAt" IS NULL
    AND "hidden" <> TRUE
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}
export default function findStatlessAlbum(): Promise<null | BareAlbum> {
  const sql = `
    SELECT "artist", "name"
    FROM "Album"
    WHERE "statsUpdatedAt" IS NULL
    AND "hidden" <> TRUE
    ORDER BY "registeredAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareAlbumSchema, sql);
}
