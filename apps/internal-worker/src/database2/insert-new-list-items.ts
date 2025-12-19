import type { Transaction } from 'kysely';
import type { DB, TagListItem } from 'kysely-codegen';

export type TagListItemUpdate = Pick<
  TagListItem,
  'albumArtist' | 'albumName' | 'place'
>;

export default function insertNewListItems(
  transaction: Transaction<DB>,
  tagName: string,
  items: TagListItemUpdate[],
) {
  return transaction
    .insertInto('TagListItem')
    .values(
      items.map((item) => ({
        ...item,
        tagName,
        updatedAt: 'NOW()',
      })),
    )
    .execute();
}
