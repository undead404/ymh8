import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import getOldStatsAlbums from '../../database2/get-old-stats-albums.js';
import getOldTagsAlbums from '../../database2/get-old-tags-albums.js';
import getStatlessAlbums from '../../database2/get-statless-albums.js';
import getTaglessAlbums from '../../database2/get-tagless-albums.js';
import getTagsToScrape from '../../database2/get-tags-to-scrape.js';
import getQueueCapacity from '../../utils/get-queue-capacity.js';

export default async function addLastfmWork(transaction: Transaction<DB>) {
  let lastfmCapacity = await getQueueCapacity(lastfmQueue);
  const summary: Record<string, number> = {};
  if (lastfmCapacity > 0) {
    const statlessAlbums = await getStatlessAlbums(transaction, lastfmCapacity);
    for (const statlessAlbum of statlessAlbums) {
      await enqueue(
        lastfmQueue,
        'album:update:stats',
        statlessAlbum.artist + ' - ' + statlessAlbum.name,
        statlessAlbum,
        1,
      );
    }
    lastfmCapacity -= statlessAlbums.length;
    summary['album:update:stats'] = statlessAlbums.length;
  }
  if (lastfmCapacity > 0) {
    const taglessAlbums = await getTaglessAlbums(transaction, lastfmCapacity);
    for (const taglessAlbum of taglessAlbums) {
      await enqueue(
        lastfmQueue,
        'album:update:tags',
        taglessAlbum.artist + ' - ' + taglessAlbum.name,
        { artist: taglessAlbum.artist, name: taglessAlbum.name },
        1,
      );
    }
    lastfmCapacity -= taglessAlbums.length;
    summary['album:update:tags'] = taglessAlbums.length;
  }
  if (lastfmCapacity > 0) {
    const tagsToScrape = await getTagsToScrape(transaction, lastfmCapacity);
    for (const tagToScrape of tagsToScrape) {
      await enqueue(lastfmQueue, 'tag:scrape', tagToScrape.name, tagToScrape);
    }
    lastfmCapacity -= tagsToScrape.length;
    summary['tag:scrape'] = tagsToScrape.length;
  }
  if (lastfmCapacity > 0) {
    const oldStatsAlbums = await getOldStatsAlbums(transaction, lastfmCapacity);
    for (const oldStatsAlbum of oldStatsAlbums) {
      await enqueue(
        lastfmQueue,
        'album:update:stats',
        oldStatsAlbum.artist + ' - ' + oldStatsAlbum.name,
        oldStatsAlbum,
        1,
      );
    }
    lastfmCapacity -= oldStatsAlbums.length;
    summary['album:update:stats'] =
      (summary['album:update:stats'] || 0) + oldStatsAlbums.length;
  }
  if (lastfmCapacity > 0) {
    const oldTagsAlbums = await getOldTagsAlbums(transaction, lastfmCapacity);
    for (const oldTagsAlbum of oldTagsAlbums) {
      await enqueue(
        lastfmQueue,
        'album:update:tags',
        oldTagsAlbum.artist + ' - ' + oldTagsAlbum.name,
        oldTagsAlbum,
        1,
      );
    }
    lastfmCapacity -= oldTagsAlbums.length;
    summary['album:update:tags'] =
      (summary['album:update:tags'] || 0) + oldTagsAlbums.length;
  }
  return summary;
}
