import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getTaglessAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Album')
    .select([
      'artist',
      'name',
      sql<number>`"Album"."playcount"::FLOAT * "Album"."listeners"`.as(
        'weight',
      ),
    ])
    .where('hidden', 'is not', true)
    .where('statsUpdatedAt', 'is not', null)
    .where('tagsUpdatedAt', 'is', null)
    .orderBy('weight', 'asc')
    .limit(limit)
    .execute();
}
