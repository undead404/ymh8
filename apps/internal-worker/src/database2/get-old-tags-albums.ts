import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getOldTagsAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  return (
    transaction
      .selectFrom('Album')
      .select(['artist', 'name'])
      .where('hidden', 'is not', true)
      // Use raw SQL for Postgres-specific time math
      .where('tagsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
      .orderBy('tagsUpdatedAt', 'asc')
      .limit(limit)
      .execute()
  );
}
