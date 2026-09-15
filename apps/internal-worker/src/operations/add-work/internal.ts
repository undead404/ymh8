import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { internalQueue } from '@ymh8/queues';
import getListlessTags from '../../database2/get-listless-tags.js';
import getOldListTags from '../../database2/get-old-list-tags.js';

import initBuild from './init-build.js';
import { createWorkJob, type Work } from './jobs.js';

export default async function addInternalWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<Work[]> {
  let internalCapacity = initialCapacity;
  const jobs: Work[] = [];
  if (internalCapacity > 0) {
    jobs.push(...(await initBuild(transaction)));
    internalCapacity -= 2;
  }
  if (internalCapacity > 0) {
    const listlessTags = await getListlessTags(transaction, internalCapacity);
    for (const listlessTag of listlessTags) {
      jobs.push(
        createWorkJob(
          internalQueue,
          'tag:list:generate',
          listlessTag.name,
          { name: listlessTag.name },
          100,
        ),
      );
    }
    internalCapacity -= listlessTags.length;
  }
  if (internalCapacity > 0) {
    const oldListTags = await getOldListTags(transaction, internalCapacity);
    for (const oldListTag of oldListTags) {
      jobs.push(
        createWorkJob(
          internalQueue,
          'tag:list:generate',
          oldListTag.name,
          oldListTag,
          100,
        ),
      );
    }
  }
  return jobs;
}
