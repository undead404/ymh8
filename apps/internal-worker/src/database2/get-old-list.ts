import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getOldList(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .selectFrom('TagListItem')
    .select(['albumArtist', 'albumName', 'place'])
    .where('tagName', '=', tagName)
    .orderBy('place', 'desc')
    .execute();
}
