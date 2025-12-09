import { Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import { QUEUES } from '@ymh8/queues';

import escapeForTelegram from './utils/escape-for-telegram.js';
import processJob from './process-job.js';
import postToTelegram from './telegram.js';
const connection = new IORedis({ maxRetriesPerRequest: null });

const worker = new Worker(
  QUEUES.INTERNAL,
  async (job) => {
    // console.log(job);
    return await processJob(job);
  },
  {
    connection,
  },
);

worker.on('failed', (job) => {
  const message = escapeForTelegram(
    'Internal worker - ' +
      job?.name +
      ': ' +
      job?.stacktrace?.at(0) +
      '\n' +
      JSON.stringify(job?.data, null, 2),
  );
  console.error(job?.stacktrace);
  postToTelegram(message).catch((error) => console.error(error));
});
