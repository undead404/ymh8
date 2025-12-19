import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findOldScrapedTag(transaction: Transaction<DB>) {
  return (
    transaction
      .selectFrom('Tag')
      .select(['name'])
      // Use raw SQL for Postgres-specific time math
      .where('albumsScrapedAt', '<', sql<Date>`NOW() - interval '1 month'`)
      .orderBy('albumsScrapedAt', 'asc')
      .limit(1)
      .executeTakeFirst()
  );
}
