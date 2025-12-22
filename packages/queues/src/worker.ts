import Bottleneck from 'bottleneck';
import { Job, Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import type { TelegramPost } from '@ymh8/schemata';

import formatJobError from './utils/format-job-error.js';
import { enqueue, telegramQueue } from './index.js';

export default function createLimitedWorker(
  queueName: string,
  processJob: (job: Job<unknown>) => Promise<unknown>,
  postErrors = true,
  limitMs = 1100,
) {
  const connection = new IORedis({ maxRetriesPerRequest: null });

  const apiLimiter = new Bottleneck({
    minTime: limitMs,
    maxConcurrent: 1, // Optional: ensures only 1 runs at a time locally
  });

  const worker = new Worker(
    queueName,
    (job) => {
      return apiLimiter.schedule(() => processJob(job));
    },
    {
      connection,
      // limiter: {
      //   max: 1, // Max 1 job
      //   duration: limitMs, // limit frequency
      // },
    },
  );
  console.log('hello from ' + queueName + ' worker');

  worker.on('failed', (job, error) => {
    console.error(job?.stacktrace);
    if (!postErrors) return;
    // writeFile('./failed-job.json', JSON.stringify(job, null, 2)).catch(
    //   (error_) => console.error(error_),
    // );
    if (!job) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if ((error as any).response?.status === 429) {
      // 3. Calculate delay (default to 60s if header missing)
      // Note: Retry-After is usually in seconds, BullMQ needs milliseconds
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const retryAfterHeader = (error as any).response.headers[
        'retry-after'
      ] as string;
      const delayMs = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10) * 1000
        : 60_000;

      // 4. Apply the manual rate limit to the worker/queue
      // This prevents THIS worker from picking up NEW jobs for `delayMs`
      telegramQueue.rateLimit(delayMs).catch((error) => console.error(error));

      // 5. Throw the special RateLimitError
      // This marks the CURRENT job as rate-limited (not failed) and
      // puts it back to wait until the rate limit expires.
      // eslint-disable-next-line unicorn/throw-new-error
      throw Worker.RateLimitError();
    }
    const message = formatJobError(job);
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
  return worker;
}
