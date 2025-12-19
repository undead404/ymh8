import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveAlbumScrapeSuccess(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return transaction
    .updateTable('Tag')
    .set({ albumsScrapedAt: 'NOW()' })
    .where('name', '=', tagName)
    .execute();
}
