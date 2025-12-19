import { Queue } from 'bullmq';

const myQueue = new Queue('TelegramQueue', {
  connection: { host: 'localhost', port: 6379 },
});

// force: true is required if there are currently active workers connected to this queue
await myQueue.obliterate({ force: true });
console.log('Queue and all data destroyed.');
