import type { BulkJobOptions } from 'bullmq';
import { type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { lastfmQueue } from '@ymh8/queues';
// Імпорти спрощено, statless видалено
import getOldStatsAlbums from '../../database2/get-old-stats-albums.js';
import getOldTagsAlbums from '../../database2/get-old-tags-albums.js';
import getTagsToScrape from '../../database2/get-tags-to-scrape.js';

import { type WorkJob } from './jobs.js';

export default async function addLastfmWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<WorkJob[]> {
  let capacity = initialCapacity;
  if (capacity <= 0) return [];

  // Масив для пакетного додавання завдань у Redis
  const jobsToEnqueue: {
    name: string;
    data: unknown;
    opts?: BulkJobOptions;
  }[] = [];

  // 2. Regular Albums (Нижчий пріоритет)
  // StatlessAlbums видалено, оскільки getOldStatsAlbums тепер захоплює і їх
  if (capacity > 0) {
    const oldStats = await getOldStatsAlbums(transaction, capacity);
    for (const album of oldStats) {
      jobsToEnqueue.push({
        name: 'album:update:stats',
        data: album,
        opts: { priority: 1, jobId: `${album.artist} - ${album.name}-stats` },
      });
    }
    capacity -= oldStats.length;
  }

  if (capacity > 0) {
    const oldTags = await getOldTagsAlbums(transaction, capacity);
    for (const album of oldTags) {
      jobsToEnqueue.push({
        name: 'album:update:tags',
        data: album,
        opts: { priority: 1, jobId: `${album.artist} - ${album.name}-tags` },
      });
    }
    capacity -= oldTags.length;
  }

  if (capacity > 0) {
    const tagsToScrape = await getTagsToScrape(transaction, capacity);
    for (const tag of tagsToScrape) {
      jobsToEnqueue.push({
        name: 'tag:scrape',
        data: tag,
        opts: { jobId: `${tag.name}-scrape` },
      });
    }
    capacity -= tagsToScrape.length;
  }

  return jobsToEnqueue.map((job) => ({
    queue: lastfmQueue,
    ...job,
  }));
}
