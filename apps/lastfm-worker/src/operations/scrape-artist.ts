import type { Job } from 'bullmq';
import { FlowProducer } from 'bullmq';
import * as v from 'valibot';

import {
  enqueue,
  generateJobId,
  lastfmQueue,
  telegramQueue,
} from '@ymh8/queues';
import { bareArtistSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import { filterNewAlbums } from '../database2/filter-new-albums.js';
import kysely from '../database2/index.js';
import insertNewAlbums from '../database2/insert-new-albums.js';
import getArtistTopAlbumsPage from '../lastfm/get-artist-top-albums-page.js';

const flowProducer = new FlowProducer({
  connection: lastfmQueue.opts.connection,
});

export const scrapeArtistPayload = v.object({
  ...bareArtistSchema.entries,
  page: v.optional(v.number()),
});

export default async function scrapeArtist(job: Job<unknown>) {
  const { page, ...bareArtist } = v.parse(scrapeArtistPayload, job.data);
  const { albums: topAlbums, childrenJobs } = await getArtistTopAlbumsPage(
    bareArtist,
    job,
    page,
  );

  return kysely.transaction().execute(async (trx) => {
    const newAlbums = await filterNewAlbums(trx, topAlbums);

    const albumsToInsert = newAlbums.map((album) => ({
      ...album,
      hidden: isAlbumNegligible(album),
    }));
    if (newAlbums.length > 0) {
      await job.log(
        `${albumsToInsert.filter(({ hidden }) => hidden).length} albums are negligible`,
      );
      await insertNewAlbums(trx, albumsToInsert);
    }

    for (const newAlbum of albumsToInsert) {
      if (!newAlbum.hidden) {
        await enqueue(
          lastfmQueue,
          'album:update:stats',
          newAlbum.artist + ' - ' + newAlbum.name,
          {
            artist: newAlbum.artist,
            name: newAlbum.name,
          },
          1,
        );
        await enqueue(
          lastfmQueue,
          'album:update:tags',
          newAlbum.artist + ' - ' + newAlbum.name,
          {
            artist: newAlbum.artist,
            name: newAlbum.name,
          },
          1,
        );
      }
    }

    if (newAlbums.length > 0) {
      await enqueue(
        telegramQueue,
        'post',
        `scraped-artist-${bareArtist.name}-${page || 1}-${new Date().toISOString()}`,
        {
          imageUrl: newAlbums.findLast(({ cover }) => cover)?.cover,
          text: `🎸 Зібрано ${newAlbums.length} нових альбомів для виконавця ${escapeForTelegram(bareArtist.name)}, сторінка ${page || 1}`,
        } satisfies TelegramPost,
        newAlbums.length,
      );
    }
    if (!page) {
      const finishJobId = generateJobId(
        'artist:scrape:finish',
        bareArtist.name,
      ).replaceAll(':', '-');
      await flowProducer.add({
        children: childrenJobs,
        data: bareArtist,
        name: 'artist:scrape:finish',
        opts: {
          deduplication: { id: finishJobId },
          jobId: finishJobId,
        },
        queueName: lastfmQueue.name,
      });
    }
    return newAlbums;
  });
}
