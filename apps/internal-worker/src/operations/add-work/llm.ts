import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { llmQueue } from '@ymh8/queues';
import getDescriptionlessTags from '../../database2/get-descriptionless-tags.js';

import { createWorkJob, type WorkJob } from './jobs.js';

export default async function addLlmWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<WorkJob[]> {
  let llmCapacity = initialCapacity;
  const jobs: WorkJob[] = [];
  if (llmCapacity > 0) {
    const descriptionlessTags = await getDescriptionlessTags(
      transaction,
      llmCapacity,
    );
    for (const descriptionlessTag of descriptionlessTags) {
      jobs.push(
        createWorkJob(
          llmQueue,
          'tag:description:generate',
          descriptionlessTag.name,
          descriptionlessTag,
          100,
        ),
      );
    }
    llmCapacity -= descriptionlessTags.length;
  }
  return jobs;
}
