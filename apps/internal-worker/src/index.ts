import { Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import { enqueue, QUEUES, telegramQueue } from '@ymh8/queues';
import type { TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';

import database from './database/index.js';
import processJob from './process-job.js';

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

  enqueue(
    telegramQueue,
    'post',
    'error-' + job?.id,
    {
      text: message,
    } satisfies TelegramPost,
    job?.priority,
  ).catch((error) => {
    console.error(error);
  });
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);

  // 1. Stop accepting new jobs and wait for current ones to finish
  await worker.close();

  // 2. Close the database pool (This kills the TCP connections)
  await database.close();

  console.log('Shutdown complete.');
  process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
