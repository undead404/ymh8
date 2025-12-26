import { FlowProducer, Job } from 'bullmq';
import * as v from 'valibot';

import { deleteTag, isTagValid } from '@ymh8/database';
import {
  enqueue,
  generateJobId,
  lastfmQueue,
  telegramQueue,
} from '@ymh8/queues';
import { bareTagSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import { filterNewAlbums } from '../database2/filter-new-albums.js';
import kysely from '../database2/index.js';
import insertNewAlbums from '../database2/insert-new-albums.js';
import getTagTopAlbumsPage from '../lastfm/get-tag-top-albums-page.js';

const flowProducer = new FlowProducer({
  connection: lastfmQueue.opts.connection,
});

const scrapeTagPayload = v.object({
  ...bareTagSchema.entries,
  page: v.optional(v.number()),
});

export default function skrapeTag(job: Job<unknown>) {
  const { page, ...bareTag } = v.parse(scrapeTagPayload, job.data);
  return kysely.transaction().execute(async (trx) => {
    if (!page) {
      const isTagLegit = await isTagValid(trx, bareTag);
      if (!isTagLegit) {
        await deleteTag(trx, bareTag.name);
        return;
      }
    }
    const { albums: topAlbums, childrenJobs } = await getTagTopAlbumsPage(
      bareTag,
      job,
      page,
    );

    const newAlbums = await filterNewAlbums(trx, topAlbums);

    if (newAlbums.length > 0) {
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
        `scraped-tag-${bareTag.name}-${page || 1}-${new Date().toISOString()}`,
        {
          imageUrl: newAlbums.findLast(({ cover }) => cover)?.cover,
          text: `🏷️ Зібрано ${newAlbums.length} нових альбомів для тега <a href="https://ymh8.pages.dev/tags/${bareTag.name.replaceAll(' ', '-')}/>${escapeForTelegram(bareTag.name)}</a>, сторінка ${page || 1}`,
        } satisfies TelegramPost,
        newAlbums.length,
      );
    }
    if (!page) {
      const finishJobId = generateJobId(
        'tag:skrape:finish',
        bareTag.name,
      ).replaceAll(':', '-');
      await flowProducer.add({
        children: childrenJobs,
        data: bareTag,
        name: 'tag:skrape:finish',
        opts: {
          deduplication: {
            id: finishJobId,
          },
          jobId: finishJobId,
        },
        queueName: lastfmQueue.name,
      });
    }
    return newAlbums;
  });
}
