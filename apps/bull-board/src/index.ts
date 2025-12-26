import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';
import * as v from 'valibot';

import {
  closeQueues,
  discogsQueue,
  internalQueue,
  lastfmQueue,
  llmQueue,
  telegramQueue,
} from '@ymh8/queues';

const optionsSchema = v.object({
  delay: v.optional(v.number()),
});

const run = () => {
  const app = express();

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/ui');

  createBullBoard({
    queues: [
      new BullMQAdapter(discogsQueue),
      new BullMQAdapter(internalQueue),
      new BullMQAdapter(lastfmQueue),
      new BullMQAdapter(llmQueue),
      new BullMQAdapter(telegramQueue),
    ],
    serverAdapter,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use('/ui', serverAdapter.getRouter());

  app.use('/add', async (request, response) => {
    const options = v.parse(optionsSchema, request.query.opts);

    if (options.delay) {
      options.delay = +options.delay * 1000; // delay must be a number
    }

    await lastfmQueue.add('Add', request.query, options);

    response.json({
      ok: true,
    });
  });

  app.listen(3004, () => {
    console.log('Running on 3004...');
    console.log('For the UI, open http://localhost:3004/ui');
    console.log('Make sure Redis is running on port 6379 by default');
    console.log('To populate the queue, run:');
    console.log('  curl http://localhost:3004/add?title=Example');
    console.log('To populate the queue with custom options (opts), run:');
    console.log('  curl http://localhost:3004/add?title=Test&opts[delay]=9');
  });
};

run();

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing the process...`);

  // 1. Stop accepting new jobs and wait for current ones to finish
  await closeQueues();

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
