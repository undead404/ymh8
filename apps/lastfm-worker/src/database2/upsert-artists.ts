import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function upsertArtists(
  transaction: Transaction<DB>,
  names: string[],
) {
  if (names.length === 0) return Promise.resolve();

  return transaction
    .insertInto('Artist')
    .values(names.map((name) => ({ name })))
    .onConflict((oc) => oc.column('name').doNothing())
    .execute();
}
