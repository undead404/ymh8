import type { Queue } from 'bullmq';

const FILLED_CAPACITY_LIMIT = 5000;

export default async function getQueueCapacity(
  queue: Queue<unknown>,
  fillLimit = FILLED_CAPACITY_LIMIT,
) {
  const waitingJobsNumber = await queue.count();
  return waitingJobsNumber < fillLimit ? fillLimit - waitingJobsNumber : 0;
}
