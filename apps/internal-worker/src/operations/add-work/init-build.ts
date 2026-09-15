import type { FlowJob } from 'bullmq';

import { generateJobId, internalQueue } from '@ymh8/queues';
import countTagLists from '../../database2/count-tag-lists.js';

import type { Work } from './jobs.js';

export default async function initBuild(
  transaction: Parameters<typeof countTagLists>[0],
): Promise<Work[]> {
  const tagListsNumber = await countTagLists(transaction);
  if (tagListsNumber === 0) {
    return [];
  }
  // only date, no time part
  const triggerDateTime = new Date().toISOString();
  const triggerDate = triggerDateTime.split('T')[0]!;
  const priority = tagListsNumber * 100;
  const buildJobId = generateJobId('astro:build', triggerDate).replaceAll(
    ':',
    '-',
  );
  const deployJobId = generateJobId('astro:deploy', triggerDate).replaceAll(
    ':',
    '-',
  );
  const flow: FlowJob = {
    children: [
      {
        data: { triggerDateTime },
        name: 'astro:build',
        queueName: internalQueue.name,
        opts: {
          deduplication: {
            id: buildJobId,
          },
          failParentOnFailure: true,
          jobId: buildJobId,
          priority,
          removeOnComplete: false,
        },
      },
    ],
    data: { triggerDateTime },
    name: 'astro:deploy',
    opts: {
      deduplication: {
        id: deployJobId,
      },
      jobId: deployJobId,
      priority: 0,
      removeOnComplete: false,
    },
    queueName: internalQueue.name,
  };
  return [{ flow }];
}
