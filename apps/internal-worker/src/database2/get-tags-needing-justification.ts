import { type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getTagsNeedingJustification(
  transaction: Transaction<DB>,
  limit: number,
) {
  return transaction
    .selectFrom('Tag')
    .select(['name'])
    .where('justification', 'is', null)
    .where('listUpdatedAt', 'is not', null)
    .orderBy('listUpdatedAt', 'asc')
    .limit(limit)
    .execute();
}
