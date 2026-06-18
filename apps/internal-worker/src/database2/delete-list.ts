import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function deleteList(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .deleteFrom('TagListItem')
    .where('TagListItem.tagName', '=', tagName)
    .execute();
}
