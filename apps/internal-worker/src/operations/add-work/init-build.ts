import { FlowProducer } from 'bullmq';

import { generateJobId, internalQueue } from '@ymh8/queues';
import countTagLists from '../../database2/count-tag-lists.js';
import kysely from '../../database2/index.js';

const flowProducer = new FlowProducer({
  connection: internalQueue.opts.connection,
});
export default async function initBuild() {
  return kysely.transaction().execute(async (trx) => {
    const tagListsNumber = await countTagLists(trx);
    if (tagListsNumber === 0) {
      return;
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
    // Implementation of any initialization logic can go here
    await flowProducer.add({
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
      },
      queueName: internalQueue.name,
    });
  });
}
