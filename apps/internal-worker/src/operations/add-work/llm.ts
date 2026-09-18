import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { llmQueue } from '@ymh8/queues';
import getDescriptionlessTags from '../../database2/get-descriptionless-tags.js';
import getTagsNeedingJustification from '../../database2/get-tags-needing-justification.js';
import readTagJustificationContext from '../../database2/read-tag-justification-context.js';

import { createWorkJob, type WorkJob } from './jobs.js';

export default async function addLlmWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<WorkJob[]> {
  let llmCapacity = initialCapacity;
  const jobs: WorkJob[] = [];
  if (llmCapacity > 0) {
    const [tagNeedingJustification] = await getTagsNeedingJustification(
      transaction,
      1,
    );
    if (tagNeedingJustification) {
      jobs.push(
        createWorkJob(
          llmQueue,
          'tag:justification:generate',
          tagNeedingJustification.name,
          await readTagJustificationContext(
            transaction,
            tagNeedingJustification.name,
          ),
          100,
        ),
      );
      llmCapacity -= 1;
    }
  }
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
