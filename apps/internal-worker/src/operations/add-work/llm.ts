import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, llmQueue } from '@ymh8/queues';
import getDescriptionlessTags from '../../database2/get-descriptionless-tags.js';
import getQueueCapacity from '../../utils/get-queue-capacity.js';

export default async function addLlmWork(transaction: Transaction<DB>) {
  let llmCapacity = await getQueueCapacity(llmQueue, 6);
  const summary: Record<string, number> = {};
  if (llmCapacity > 0) {
    const descriptionlessTags = await getDescriptionlessTags(
      transaction,
      llmCapacity,
    );
    for (const descriptionlessTag of descriptionlessTags) {
      await enqueue(
        llmQueue,
        'tag:description:generate',
        descriptionlessTag.name,
        descriptionlessTag,
        100,
      );
    }
    summary['tag:description:generate'] = descriptionlessTags.length;
    llmCapacity -= descriptionlessTags.length;
  }
  return summary;
}
