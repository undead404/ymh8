import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function hideArtist(
  transaction: Transaction<DB>,
  artistName: string,
) {
  await transaction
    .updateTable('Artist')
    .set({ hidden: true })
    .where('name', '=', artistName)
    .execute();
  await transaction
    .updateTable('Album')
    .set({ hidden: true })
    .where('artist', '=', artistName)
    .execute();
}
