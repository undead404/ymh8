import { Queue, Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });

// 1. The Queue (Traffic Cop)
const myQueue = new Queue('LastfmQueue', { connection });

console.log('Hello from Issuer service!');