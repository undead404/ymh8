import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { TagListItemUpdate } from './insert-new-list-items.js';

export default function updateTagListItem(
  transaction: Transaction<DB>,
  tagName: string,
  tagListItemUpdate: TagListItemUpdate,
) {
  return transaction
    .updateTable('TagListItem')
    .set({
      albumArtist: tagListItemUpdate.albumArtist,
      albumName: tagListItemUpdate.albumName,
      updatedAt: 'NOW()',
    })
    .where('tagName', '=', tagName)
    .where('place', '=', tagListItemUpdate.place)
    .execute();
}
