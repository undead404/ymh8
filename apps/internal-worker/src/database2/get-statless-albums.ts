import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getStatlessAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Album')
    .select(['artist', 'name'])
    .where('statsUpdatedAt', 'is', null)
    .where('hidden', 'is not', true)
    .orderBy('registeredAt', 'asc')
    .limit(limit)
    .execute();
}
