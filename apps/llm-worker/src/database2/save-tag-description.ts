import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveTagDescription(
  transaction: Transaction<DB>,
  tagName: string,
  description: string,
) {
  return transaction
    .updateTable('Tag')
    .set({ description })
    .where('name', '=', tagName)
    .execute();
}
