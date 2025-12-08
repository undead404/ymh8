import { type BareTag, bareTagSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countListlessTags(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NOT NULL
    AND "listCheckedAt" IS NOT NULL
    AND (
        "listCheckedAt" IS NULL
        OR "listCheckedAt" < (NOW() - interval '1 month')
    )
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
    SELECT "name"
    FROM "Tag"
    WHERE "albumsScrapedAt" IS NOT NULL
    AND "listCheckedAt" IS NOT NULL
    AND (
        "listCheckedAt" IS NULL
        OR "listCheckedAt" < (NOW() - interval '1 month')
    )
    AND "listUpdatedAt" IS NULL
    ORDER BY
		"listCheckedAt" IS NULL DESC,
		"listCheckedAt"
    LIMIT 1
  `;
  return database.queryOne(bareTagSchema, sql);
}
