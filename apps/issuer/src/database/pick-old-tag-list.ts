import { type BareTag, bareTagSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countOldTagLists(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NOT NULL
    AND "listUpdatedAt" IS NOT NULL
    AND "listCheckedAt" < (NOW() - interval '1 day')
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}

export default function pickOldTagList(): Promise<null | BareTag> {
  const sql = `
    SELECT "name"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NOT NULL
    AND "listUpdatedAt" IS NOT NULL
    AND "listCheckedAt" < (NOW() - interval '1 day')
    ORDER BY "listCheckedAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareTagSchema, sql);
}
