import Bottleneck from 'bottleneck';
import type { Job } from 'bullmq';

export function createJobProcessor(
  operations: Record<string, (job: Job<unknown>) => Promise<unknown>>,
  limitMs = 2000,
) {
  const apiLimiter = new Bottleneck({
    minTime: limitMs,
    maxConcurrent: 1, // Optional: ensures only 1 runs at a time locally
  });

  return async function processJob(job: Job): Promise<unknown> {
    // console.log(operationsMapping);
    // await writeFile('job.json', JSON.stringify(job, null, 2));
    const operate = operations[job.name];
    if (!operate) {
      throw new Error('No operation to handle this job');
    }
    return apiLimiter.schedule(() => operate(job));
  };
}
