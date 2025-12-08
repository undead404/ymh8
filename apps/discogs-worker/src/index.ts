import { Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import { QUEUES } from '@ymh8/queues';

import escapeForTelegram from './utils/escape-for-telegram.js';
import processJob from './process-job.js';
import postToTelegram from './telegram.js';

const connection = new IORedis({ maxRetriesPerRequest: null });

console.log('hello from discogs worker');

const worker = new Worker(
  QUEUES.DISCOGS,
  async (job) => {
    // console.log('job', job);
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

worker.on('failed', (job) => {
  const message = escapeForTelegram(
    'Discogs worker - ' + job?.stacktrace.join('\n'),
  );
  console.error(job?.stacktrace);
  postToTelegram(message).catch((error) => console.error(error));
});
