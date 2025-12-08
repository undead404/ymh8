import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue as QueueMQ, type RedisOptions } from 'bullmq';
import express from 'express';
import * as v from 'valibot';

import { QUEUES } from '@ymh8/queues';

// const sleep = (t: number) =>
//   new Promise((resolve) => setTimeout(resolve, t * 1000));

const redisOptions: RedisOptions = {
  port: 6379,
  host: 'localhost',
  password: '',
};

const optionsSchema = v.object({
  delay: v.optional(v.number()),
});

const createQueueMQ = (name: string) =>
  new QueueMQ(name, { connection: redisOptions });

const run = () => {
  const discogsBullMq = createQueueMQ(QUEUES.DISCOGS);
  const lastfmBullMq = createQueueMQ(QUEUES.LASTFM);
  const internalBullMq = createQueueMQ(QUEUES.INTERNAL);

  const app = express();

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/ui');

  createBullBoard({
    queues: [
      new BullMQAdapter(discogsBullMq),
      new BullMQAdapter(lastfmBullMq),
      new BullMQAdapter(internalBullMq),
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

    await lastfmBullMq.add('Add', { title: request.query.title }, options);

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
