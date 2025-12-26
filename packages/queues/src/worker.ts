import { Job, type Queue, Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import getErrorHandler from './utils/get-error-handler.js';
import getFailHandler from './utils/get-fail-handler.js';

export default function createLimitedWorker(
  queue: Queue<unknown>,
  processorPath: string,
  postErrors = true,
  limitMs = 2000,
) {
  const connection = new IORedis({ maxRetriesPerRequest: null });

  const worker = new Worker(queue.name, processorPath, {
    connection,
    limiter: {
      max: 1,
      duration: limitMs,
    },
    lockDuration: 60_000,
    // FIX 2: Relaxed stalled settings since we handle shutdown manually now
    maxStalledCount: 1,
  });

  const activeJobIds = new Set<string>();

  worker.on('active', (job) => {
    activeJobIds.add(job.id!);
  });

  // Handle cleanup on completion/failure
  const cleanupParameters = (job?: Job) => {
    if (job?.id) activeJobIds.delete(job.id);
  };

  worker.on('completed', cleanupParameters);
  worker.on('failed', cleanupParameters);

  // Attach your custom logging/handlers
  console.log('hello from ' + queue.name + ' worker');
  worker.on('failed', getFailHandler(queue, postErrors));
  worker.on('error', getErrorHandler(queue, postErrors));

  // FIX 3: Return the shutdown logic instead of registering process.exit internally
  const close = async () => {
    console.log(`Closing worker ${queue.name} and releasing jobs...`);

    // 1. Pause processing
    await worker.pause();

    // 2. Retry active jobs
    const retryPromises = [...activeJobIds].map(async (id) => {
      try {
        const job = await Job.fromId(queue, id);
        if (job && (await job.isActive())) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          (job as any).token = worker.id;
          await job.retry();
          console.log(`Job ${id} from ${queue.name} moved to waiting`);
        }
      } catch (error) {
        console.error(`Failed to retry job ${id} in ${queue.name}:`, error);
      }
    });

    await Promise.all(retryPromises);

    // 3. Close the worker connection
    await worker.close();

    // Note: We do NOT close the 'queue' here because it was passed in as an argument.
    // The caller might still be using it. If you want to close it, do it in the caller.
  };

  return { worker, close };
}
