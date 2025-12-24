import Bottleneck from 'bottleneck';
import { Job, Queue, Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import getErrorHandler from './utils/get-error-handler.js';
import getFailHandler from './utils/get-fail-handler.js';

export default function createLimitedWorker(
  queue: Queue<unknown>,
  processJob: (job: Job<unknown>) => Promise<unknown>,
  postErrors = true,
  limitMs = 2000,
) {
  const connection = new IORedis({ maxRetriesPerRequest: null });

  const apiLimiter = new Bottleneck({
    minTime: limitMs,
    maxConcurrent: 1, // Optional: ensures only 1 runs at a time locally
  });

  const worker = new Worker(
    queue.name,
    (job) => {
      return apiLimiter.schedule(() => processJob(job));
    },
    {
      connection,
      limiter: {
        max: 1, // Max 1 job
        duration: limitMs, // limit frequency
      },
    },
  );
  console.log('hello from ' + queue.name + ' worker');
  worker.on('failed', getFailHandler(queue, postErrors));
  worker.on('error', getErrorHandler(queue, postErrors));
  return worker;
}
