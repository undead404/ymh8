import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findStatlessAlbum(transaction: Transaction<DB>) {
  return transaction
    .selectFrom('Album')
    .select(['artist', 'name'])
    .where('statsUpdatedAt', 'is', null)
    .where('hidden', 'is not', true)
    .orderBy('registeredAt', 'asc')
    .limit(1)
    .executeTakeFirst();
}
