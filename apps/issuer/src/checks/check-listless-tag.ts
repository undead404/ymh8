import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, internalQueue } from '@ymh8/queues';
import findListlessTag from '../database2/find-listless-tag.js';

export default async function checkListlessTag(transaction: Transaction<DB>) {
  // const listlessTag = await pickListlessTag();
  const listlessTag = await findListlessTag(transaction);
  if (!listlessTag) {
    return;
  }
  if (listlessTag.albumCount < 100) {
    return;
  }
  console.log('listlessTag', listlessTag);
  await enqueue(internalQueue, 'tag:list:generate', listlessTag.name, {
    name: listlessTag.name,
  });
}
