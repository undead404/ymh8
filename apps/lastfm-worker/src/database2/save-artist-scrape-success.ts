import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function saveArtistScrapeSuccess(
  transaction: Transaction<DB>,
  artistName: string,
) {
  return transaction
    .updateTable('Artist')
    .set({ albumsScrapedAt: 'NOW()' })
    .where('name', '=', artistName)
    .execute();
}
