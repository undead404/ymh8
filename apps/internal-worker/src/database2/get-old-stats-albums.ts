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
      .where('artist', '<>', 'Various Artists')
      // Use raw SQL for Postgres-specific time math
      .where('statsUpdatedAt', '<', sql<Date>`NOW() - interval '3 months'`)
      .orderBy('date', (ob) => ob.desc().nullsLast())
      .limit(limit)
      .execute()
  );
}
