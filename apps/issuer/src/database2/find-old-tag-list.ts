import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findOldTagList(transaction: Transaction<DB>) {
  return (
    transaction
      .selectFrom('Tag')
      .select(['name'])
      .where('albumsScrapedAt', 'is not', null)
      .where('listUpdatedAt', 'is not', null)
      // Use raw SQL for Postgres-specific time math
      .where('listCheckedAt', '<', sql<Date>`NOW() - interval '1 day'`)
      .orderBy('listCheckedAt', 'asc')
      .limit(1)
      .executeTakeFirst()
  );
}
