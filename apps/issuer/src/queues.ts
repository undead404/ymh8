import { Queue } from 'bullmq';
import { Redis as IORedis } from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });

export const lastfmQueue = new Queue('LastfmQueue', { connection });
