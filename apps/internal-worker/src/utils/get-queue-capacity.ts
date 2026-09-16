import type { Queue } from 'bullmq';

const FILLED_CAPACITY_LIMIT = 2000;

export default async function getQueueCapacity(
  queue: Queue<unknown>,
  fillLimit = FILLED_CAPACITY_LIMIT,
) {
  const counts = await queue.getJobCounts(
    'wait',
    'active',
    'prioritized',
    'delayed',
    'waiting-children',
  );
  const waitingJobsNumber =
    (counts.wait ?? 0) +
    (counts.active ?? 0) +
    (counts.prioritized ?? 0) +
    (counts.delayed ?? 0) +
    (counts['waiting-children'] ?? 0);
  return waitingJobsNumber < fillLimit ? fillLimit - waitingJobsNumber : 0;
}
