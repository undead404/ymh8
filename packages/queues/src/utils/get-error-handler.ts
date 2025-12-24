import { type Queue } from 'bullmq';

import type { TelegramPost } from '@ymh8/schemata';
import { enqueue, telegramQueue } from '../index.js';

export default function getErrorHandler(
  queue: Queue<unknown>,
  postErrors: boolean,
) {
  return (error: Error) => {
    console.error(error);

    // Notification Logic
    // Without a job object, we cannot check attemptsMade vs opts.attempts.
    // We report all errors if postErrors is true.
    if (!postErrors) return;

    // eslint-disable-next-line promise/no-promise-in-callback
    enqueue(
      telegramQueue,
      'post',
      `worker-error-${Date.now()}`, // No job ID available, use timestamp
      {
        text: `${queue.name} error: ${error.name}\n${error.message}\n${error.stack ?? ''}`,
      } satisfies TelegramPost, // No job priority available
    ).catch((error_) => {
      console.error(error_);
    });
  };
}
