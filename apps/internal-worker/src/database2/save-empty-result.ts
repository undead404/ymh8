import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveEmptyResult(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .updateTable('Tag')
    .set({
      listCheckedAt: 'NOW()',
      listUpdatedAt: null,
    })
    .where('name', '=', tagName)
    .execute();
}
