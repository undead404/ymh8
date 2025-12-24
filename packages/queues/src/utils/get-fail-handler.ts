import { type Job, type Queue, Worker } from 'bullmq';

import type { TelegramPost } from '@ymh8/schemata';
import { enqueue, telegramQueue } from '../index.js';

import formatJobError from './format-job-error.js';

export default function getFailHandler<T>(
  queue: Queue<T>,
  postErrors: boolean,
) {
  return (job: Job<T> | undefined, error: Error) => {
    console.error(job?.stacktrace);
    // writeFile('./failed-job.json', JSON.stringify(job, null, 2)).catch(
    //   (error_) => console.error(error_),
    // );
    if (!job) return;
    const lowercasedReason = job.failedReason?.toLowerCase() || '';
    if (
      lowercasedReason.includes('rate') &&
      lowercasedReason.includes('limit')
    ) {
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
      queue.rateLimit(delayMs).catch((error) => console.error(error));

      // 5. Throw the special RateLimitError
      // This marks the CURRENT job as rate-limited (not failed) and
      // puts it back to wait until the rate limit expires.
      // eslint-disable-next-line unicorn/throw-new-error
      throw Worker.RateLimitError();
    }
    if (
      !postErrors ||
      (job.opts.attempts && job.attemptsMade < job.opts.attempts)
    )
      return;
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
  };
}
