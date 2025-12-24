import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, internalQueue } from '@ymh8/queues';
import getListlessTags from '../../database2/get-listless-tags.js';
import getOldListTags from '../../database2/get-old-list-tags.js';
import getQueueCapacity from '../../utils/get-queue-capacity.js';

import initBuild from './init-build.js';

export default async function addInternalWork(transaction: Transaction<DB>) {
  let internalCapacity = await getQueueCapacity(internalQueue);
  const summary: Record<string, number> = {};
  if (internalCapacity > 0) {
    await initBuild();
    internalCapacity -= 2;
    summary['astro:build'] = 1;
    summary['astro:deploy'] = 1;
  }
  if (internalCapacity > 0) {
    const listlessTags = await getListlessTags(transaction, internalCapacity);
    for (const listlessTag of listlessTags) {
      await enqueue(
        internalQueue,
        'tag:list:generate',
        listlessTag.name,
        { name: listlessTag.name },
        100,
      );
    }
    internalCapacity -= listlessTags.length;
    summary['tag:list:generate'] = listlessTags.length;
  }
  if (internalCapacity > 0) {
    const oldListTags = await getOldListTags(transaction, internalCapacity);
    for (const oldListTag of oldListTags) {
      await enqueue(
        internalQueue,
        'tag:list:generate',
        oldListTag.name,
        oldListTag,
        100,
      );
    }
    internalCapacity -= oldListTags.length;
    summary['tag:list:generate'] =
      (summary['tag:list:generate'] || 0) + oldListTags.length;
  }
  return summary;
}
