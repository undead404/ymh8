import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getOldStatsAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  return (
    transaction
      .selectFrom('Album')
      .select(['artist', 'name'])
      .where('hidden', 'is not', true)
      // Use raw SQL for Postgres-specific time math
      .where('statsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
      .orderBy('statsUpdatedAt', 'asc')
      .limit(limit)
      .execute()
  );
}
