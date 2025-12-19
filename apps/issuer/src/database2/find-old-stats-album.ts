import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findOldStatsAlbum(transaction: Transaction<DB>) {
  return (
    transaction
      .selectFrom('Album')
      .select(['artist', 'name'])
      .where('hidden', 'is not', true)
      // Use raw SQL for Postgres-specific time math
      .where('statsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
      .orderBy('statsUpdatedAt', 'asc')
      .limit(1)
      .executeTakeFirst()
  );
}
