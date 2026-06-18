import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function isTagListful(
  transaction: Transaction<DB>,
  tagName: string,
): Promise<boolean> {
  const result = await transaction
    .selectFrom('Tag')
    .select(sql<1>`1`.as('exists'))
    .where('name', '=', tagName)
    .where('listUpdatedAt', 'is not', null)
    .executeTakeFirst();

  console.log(`Tag ${tagName} ${result ? 'is' : 'is not'} listful`);
  return !!result;
}
