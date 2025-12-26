import path from 'node:path';

import { closeQueues, createLimitedWorker, discogsQueue } from '@ymh8/queues';

// import database from './database/index.js';
import kysely from './database2/index.js';

const { close } = createLimitedWorker(
  discogsQueue,
  path.join(import.meta.dirname, './process-job.js'),
);

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);

  // 1. Stop accepting new jobs
  await close();
  await closeQueues();

  // 2. Close the database pool (This kills the TCP connections)
  await kysely.destroy();

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
