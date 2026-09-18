import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function saveTagJustification(
  transaction: Transaction<DB>,
  tagName: string,
  justification: string,
) {
  const result = await transaction
    .updateTable('Tag')
    .set({ justification })
    .where('name', '=', tagName)
    .where('justification', 'is', null)
    .executeTakeFirst();

  if (Number(result.numUpdatedRows) !== 1) {
    throw new Error(`Tag justification conflict for ${tagName}`);
  }
}
