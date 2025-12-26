import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function countTagLists(transaction: Transaction<DB>) {
  const result = await transaction
    .selectFrom('Tag')
    .where('listUpdatedAt', 'is not', null)
    .select(({ fn }) => [fn.count<number>('name').as('count')])
    .executeTakeFirstOrThrow();
  return result.count;
}
