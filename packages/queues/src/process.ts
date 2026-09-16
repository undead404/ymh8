import Bottleneck from 'bottleneck';
import { type Job, UnrecoverableError } from 'bullmq';

export interface JobOperation {
  operate: (job: Job<unknown>) => Promise<unknown>;
  schema: (data: unknown) => unknown;
}

export function createJobProcessor(
  operations: Record<string, JobOperation>,
  limitMs = 2000,
) {
  const apiLimiter = new Bottleneck({
    minTime: limitMs,
    maxConcurrent: 1, // Optional: ensures only 1 runs at a time locally
  });

  return async function processJob(job: Job): Promise<unknown> {
    // console.log(operationsMapping);
    // await writeFile('job.json', JSON.stringify(job, null, 2));
    const operation = operations[job.name];
    if (!operation) {
      throw new Error('No operation to handle this job');
    }
    let parsedData: unknown;
    try {
      parsedData = operation.schema(job.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new UnrecoverableError(
        `Invalid payload for operation ${job.name}: ${message}`,
      );
    }
    job.data = parsedData;
    return apiLimiter.schedule(() => operation.operate(job));
  };
}
