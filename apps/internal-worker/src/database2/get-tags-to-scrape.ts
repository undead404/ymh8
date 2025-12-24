import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getTagsToScrape(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Tag')
    .select(['name'])
    .where((eb) =>
      eb.or([
        eb('Tag.albumsScrapedAt', 'is', null),
        // Use raw SQL for Postgres-specific time math
        eb('albumsScrapedAt', '<', sql<Date>`NOW() - interval '1 month'`),
      ]),
    )
    .orderBy(sql`listUpdatedAt is not null`, 'desc')
    .orderBy(sql`${sql.ref('albumsScrapedAt')} asc nulls first`)
    .limit(limit)
    .execute();
}
