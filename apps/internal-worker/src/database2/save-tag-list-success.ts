import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveTagListSuccess(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .updateTable('Tag')
    .set({
      listCheckedAt: 'NOW()',
      listUpdatedAt: 'NOW()',
    })
    .where('name', '=', tagName)
    .execute();
}
