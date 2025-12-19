import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareTag } from '@ymh8/schemata';

export default function upsertTags(
  transaction: Transaction<DB>,
  tags: BareTag[],
) {
  return transaction
    .insertInto('Tag')
    .values(tags)
    .onConflict((oc) => oc.doNothing())
    .execute();
}
