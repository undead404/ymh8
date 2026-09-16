import type { Queue } from 'bullmq';

const FILLED_CAPACITY_LIMIT = 5000;

export default async function getQueueCapacity(
  queue: Queue<unknown>,
  fillLimit = FILLED_CAPACITY_LIMIT,
) {
  const counts = await queue.getJobCounts('wait', 'active', 'prioritized');
  const waitingJobsNumber =
    (counts.wait ?? 0) + (counts.active ?? 0) + (counts.prioritized ?? 0);
  return waitingJobsNumber < fillLimit ? fillLimit - waitingJobsNumber : 0;
}
