import type { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { enqueue, lastfmQueue, telegramQueue } from '@ymh8/queues';
import { bareArtistSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import { filterNewAlbums } from '../database2/filter-new-albums.js';
import kysely from '../database2/index.js';
import insertNewAlbums from '../database2/insert-new-albums.js';
import getArtistTopAlbums from '../lastfm/get-artist-top-albums.js';

const scrapeArtistPayload = v.object({
  ...bareArtistSchema.entries,
  page: v.optional(v.number()),
});

export default async function scrapeArtist(job: Job<unknown>) {
  const { page, ...bareArtist } = v.parse(scrapeArtistPayload, job.data);
  const topAlbums = await getArtistTopAlbums(bareArtist, job, page);

  return kysely.transaction().execute(async (trx) => {
    const newAlbums = await filterNewAlbums(trx, topAlbums);

    if (newAlbums.length === 0) {
      return [];
    }
    // await saveNewAlbums(newAlbums);

    const albumsToInsert = newAlbums.map((album) => ({
      ...album,
      hidden: isAlbumNegligible(album),
    }));
    await job.log(
      `${albumsToInsert.filter(({ hidden }) => hidden).length} albums are negligible`,
    );
    await insertNewAlbums(trx, albumsToInsert);

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

    await enqueue(
      telegramQueue,
      'post',
      `scraped-artist-${bareArtist.name}-${page || 1}-${uuidv4()}`,
      {
        imageUrl: newAlbums.findLast(({ cover }) => cover)?.cover,
        text: `🎸 Зібрано ${newAlbums.length} нових альбомів для виконавця ${escapeForTelegram(bareArtist.name)}, сторінка ${page || 1}`,
      } satisfies TelegramPost,
      newAlbums.length,
    );
    return newAlbums;
  });
}
