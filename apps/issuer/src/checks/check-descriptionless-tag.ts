import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, llmQueue } from '@ymh8/queues';
import findDescriptionlessTag from '../database2/find-descriptionless-tag.js';

export default async function checkDescriptionlessTag(
  transaction: Transaction<DB>,
) {
  // const descriptionlessTag = await pickDescriptionlessTag();
  const descriptionlessTag = await findDescriptionlessTag(transaction);
  if (!descriptionlessTag) {
    return;
  }
  console.log('descriptionlessTag', descriptionlessTag);
  await enqueue(
    llmQueue,
    'tag:description:generate',
    descriptionlessTag.name,
    descriptionlessTag,
    100,
  );
}
