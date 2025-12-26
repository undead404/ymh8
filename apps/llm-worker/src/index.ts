import path from 'node:path';

import { closeQueues, createLimitedWorker, llmQueue } from '@ymh8/queues';

// import database from './database/index.js';
import kysely from './database2/index.js';

const { close } = createLimitedWorker(
  llmQueue,
  path.join(import.meta.dirname, './process-job.js'),
  true,
  60_000,
);

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);

  // 1. Stop accepting new jobs and wait for current ones to finish
  await close();
  await closeQueues();

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
