import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function findDescriptionlessTag(transaction: Transaction<DB>) {
  return transaction
    .selectFrom('Tag')
    .select(['name'])
    .where('description', 'is', null)
    .where('listUpdatedAt', 'is not', null)
    .orderBy('listUpdatedAt', 'asc')
    .limit(1)
    .executeTakeFirst();
}
