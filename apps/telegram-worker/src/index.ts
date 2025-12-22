import { createLimitedWorker, telegramQueue } from '@ymh8/queues';

import processJob from './process-job.js';

const worker = createLimitedWorker(telegramQueue.name, (job) =>
  processJob(job),
);

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
