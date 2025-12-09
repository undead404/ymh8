import crypto from 'node:crypto';

import { Queue } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

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
    removeOnComplete: 1000, // Good practice to keep Redis clean
    removeOnFail: 5000, // Keep failed jobs for debugging
  },
});

export default function generateJobName(
  operationName: string,
  identity: string,
) {
  const hash = crypto.createHash('md5').update(identity).digest('hex');
  return `${operationName}:${hash}`;
}

export async function enqueue(
  queue: Queue,
  operationName: string,
  identity: string,
  data: unknown,
) {
  const jobName = generateJobName(operationName, identity);
  await queue.add(jobName, data, {
    jobId: jobName.replaceAll(':', '-'),
    deduplication: {
      id: jobName,
    },
  });
}

export { QUEUES } from './constants.js';
