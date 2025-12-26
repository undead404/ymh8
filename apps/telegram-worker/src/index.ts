import path from 'node:path';

import { closeQueues, createLimitedWorker, telegramQueue } from '@ymh8/queues';

const { close } = createLimitedWorker(
  telegramQueue,
  path.join(import.meta.dirname, './process-job.js'),
  false,
);

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);

  // 1. Stop accepting new jobs and wait for current ones to finish
  await close();
  await closeQueues();

  console.log('Shutdown complete.');
  // process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
