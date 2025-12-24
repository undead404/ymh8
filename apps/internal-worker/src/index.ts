import { createLimitedWorker, internalQueue } from '@ymh8/queues';

// import database from './database/index.js';
import kysely from './database2/index.js';
import processJob from './process-job.js';

const worker = createLimitedWorker(internalQueue, (job) => processJob(job));

await internalQueue.add(
  'add-work',
  {},
  {
    deduplication: {
      id: 'add-work',
    },
    jobId: 'add-work',
    repeat: { pattern: '0 * * * *' },
  },
);

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);

  // 1. Stop accepting new jobs and wait for current ones to finish
  await worker.close();

  // 2. Close the database pool (This kills the TCP connections)
  // await database.close();
  await kysely.destroy();

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
