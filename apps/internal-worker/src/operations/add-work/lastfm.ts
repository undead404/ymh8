import { type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { lastfmQueue } from '@ymh8/queues';
import getArtistsToScrape from '../../database2/get-artists-to-scrape.js';
import getOldStatsAlbums from '../../database2/get-old-stats-albums.js';
import getOldTagsAlbums from '../../database2/get-old-tags-albums.js';
import getTagsToScrape from '../../database2/get-tags-to-scrape.js';

import { createWorkJob, type WorkJob } from './jobs.js';

export default async function addLastfmWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<WorkJob[]> {
  let capacity = initialCapacity;
  if (capacity <= 0) return [];

  const jobsToEnqueue: WorkJob[] = [];

  // 2. Regular Albums (Нижчий пріоритет)
  // StatlessAlbums видалено, оскільки getOldStatsAlbums тепер захоплює і їх
  if (capacity > 0) {
    const oldStats = await getOldStatsAlbums(transaction, capacity);
    for (const album of oldStats) {
      jobsToEnqueue.push(
        createWorkJob(
          lastfmQueue,
          'album:update:stats',
          `${album.artist} - ${album.name}`,
          album,
          1,
        ),
      );
    }
    capacity -= oldStats.length;
  }

  if (capacity > 0) {
    const oldTags = await getOldTagsAlbums(transaction, capacity);
    for (const album of oldTags) {
      jobsToEnqueue.push(
        createWorkJob(
          lastfmQueue,
          'album:update:tags',
          `${album.artist} - ${album.name}`,
          album,
          1,
        ),
      );
    }
    capacity -= oldTags.length;
  }

  if (capacity > 0) {
    const tagsToScrape = await getTagsToScrape(transaction, capacity);
    for (const tag of tagsToScrape) {
      jobsToEnqueue.push(
        createWorkJob(lastfmQueue, 'tag:scrape', tag.name, tag),
      );
    }
    capacity -= tagsToScrape.length;
  }

  if (capacity > 0) {
    const artistsToScrape = await getArtistsToScrape(transaction, capacity);
    for (const artist of artistsToScrape) {
      jobsToEnqueue.push(
        createWorkJob(lastfmQueue, 'artist:scrape', artist.name, artist),
      );
    }
    capacity -= artistsToScrape.length;
  }

  return jobsToEnqueue;
}
