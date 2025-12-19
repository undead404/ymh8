import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findOldTagsAlbum(transaction: Transaction<DB>) {
  return (
    transaction
      .selectFrom('Album')
      .select(['artist', 'name'])
      .where('hidden', 'is not', true)
      // Use raw SQL for Postgres-specific time math
      .where('tagsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
      .orderBy('tagsUpdatedAt', 'asc')
      .limit(1)
      .executeTakeFirst()
  );
}
