import Bottleneck from 'bottleneck';
import { Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

import { enqueue, QUEUES, telegramQueue } from '@ymh8/queues';
import type { TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';

import processJob from './process-job.js';

// 1. Create a limiter that enforces strictly 1 request every 1.1 seconds
//    (Adding a small buffer over 1000ms accounts for network latency)
const apiLimiter = new Bottleneck({
  minTime: 1100,
  maxConcurrent: 1, // Optional: ensures only 1 runs at a time locally
});
const connection = new IORedis({ maxRetriesPerRequest: null });

console.log('hello from Telegram worker');

const worker = new Worker(
  QUEUES.TELEGRAM,
  async (job) => {
    return apiLimiter.schedule(() => processJob(job));
  },
  {
    connection,
    // limiter: {
    //   max: 1, // Max 1 job
    //   duration: 2000, // limit frequency
    // },
  },
);

worker.on('failed', (job, error) => {
  const message = escapeForTelegram(
    'Telegram worker - ' +
      job?.name +
      ': ' +
      `${error.message}` +
      '\n' +
      JSON.stringify(job?.data, null, 2),
  );
  console.error(job?.stacktrace);
  console.error(job?.data);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
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
