import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function deleteTag(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction.deleteFrom('Tag').where('name', '=', tagName).execute();
}
