import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, internalQueue } from '@ymh8/queues';
import findOldTagList from '../database2/find-old-tag-list.js';

export default async function renewOldList(transaction: Transaction<DB>) {
  // const oldListTag = await pickOldTagList();
  const oldListTag = await findOldTagList(transaction);
  console.log('oldListTag', oldListTag);
  if (!oldListTag) {
    return;
  }
  await enqueue(
    internalQueue,
    'tag:list:generate',
    oldListTag.name,
    oldListTag,
    100,
  );
}
