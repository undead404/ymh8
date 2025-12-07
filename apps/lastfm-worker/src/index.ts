import { Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import processJob from './process-job.js';
const connection = new IORedis({ maxRetriesPerRequest: null });

console.log('hello from worker');

const worker = new Worker(
  'LastfmQueue',
  async (job) => {
    return await processJob(job);
  },
  {
    connection,
    limiter: {
      max: 1, // Max 1 job
      duration: 1100, // limit frequency
    },
  },
);

worker.on('error', (reason) => {
  console.error(reason);
});
