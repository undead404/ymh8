import { type BareTag, bareTagSchema } from '@ymh8/schemata';
import { countSchema } from '../count-schema.js';

import database from './index.js';

export async function countDescriptionlessTags(): Promise<number> {
  const sql = `
    SELECT COUNT(*) AS "count"
    FROM "Tag"
    WHERE "description" IS NULL
    AND "listUpdatedAt" IS NOT NULL
  `;
  const countBearer = await database.queryOne(countSchema, sql);
  if (!countBearer) {
    throw new Error('Failed to count');
  }
  return countBearer.count;
}

export default function pickDescriptionlessTag(): Promise<null | BareTag> {
  const sql = `
    SELECT "name"
    FROM "Tag"
    WHERE "description" IS NULL
    AND "listUpdatedAt" IS NOT NULL
    ORDER BY
		  "listUpdatedAt" ASC
    LIMIT 1
  `;
  return database.queryOne(bareTagSchema, sql);
}
