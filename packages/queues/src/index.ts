import { Queue } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import generateJobId from './utils/generate-job-id.js';
import { QUEUES } from './constants.js';

const connection = new IORedis({ maxRetriesPerRequest: null });

export const discogsQueue = new Queue(QUEUES.DISCOGS, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: 1000, // Good practice to keep Redis clean
    removeOnFail: 5000, // Keep failed jobs for debugging
  },
});

export const lastfmQueue = new Queue(QUEUES.LASTFM, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: 1000, // Good practice to keep Redis clean
    removeOnFail: 5000, // Keep failed jobs for debugging
  },
});

export const internalQueue = new Queue(QUEUES.INTERNAL, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: 100, // Good practice to keep Redis clean
    removeOnFail: 10, // Keep failed jobs for debugging
  },
});

export const telegramQueue = new Queue(QUEUES.TELEGRAM, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 30_000,
    },
    removeOnComplete: 1000, // Good practice to keep Redis clean
    removeOnFail: 5000, // Keep failed jobs for debugging
  },
});

export const llmQueue = new Queue(QUEUES.LLM, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60_000,
    },
    removeOnComplete: 100, // Good practice to keep Redis clean
    removeOnFail: 500, // Keep failed jobs for debugging
  },
});

const QUEUE_SIZE_LIMIT = 1_000_000;

export async function enqueue(
  queue: Queue,
  operationName: string,
  identity: string,
  data: unknown,
  priority?: number,
) {
  const jobId = generateJobId(operationName, identity);
  const counts = await queue.getJobCounts('wait', 'delayed');
  const currentSize = (counts.wait ?? 0) + (counts.delayed ?? 0);

  if (currentSize >= QUEUE_SIZE_LIMIT) {
    throw new Error('Queue is full, try again later.');
  }
  await queue.add(operationName, data, {
    jobId: jobId.replaceAll(':', '-'),
    deduplication: {
      id: jobId,
    },
    ...(priority === undefined ? {} : { priority }),
  });
}

export function closeQueues() {
  return Promise.all([
    discogsQueue.close(),
    internalQueue.close(),
    lastfmQueue.close(),
    llmQueue.close(),
    telegramQueue.close(),
  ]);
}

export { QUEUES } from './constants.js';
export { createJobProcessor } from './process.js';
export { default as generateJobId } from './utils/generate-job-id.js';
export { default as createLimitedWorker } from './worker.js';
