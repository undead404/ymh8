import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveNoListChange(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .updateTable('Tag')
    .set({
      listCheckedAt: 'NOW()',
    })
    .where('name', '=', tagName)
    .execute();
}
