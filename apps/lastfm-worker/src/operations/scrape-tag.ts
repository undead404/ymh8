import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { deleteTag, isTagValid2 } from '@ymh8/database';
import {
  enqueue,
  internalQueue,
  lastfmQueue,
  telegramQueue,
} from '@ymh8/queues';
import {
  type BareAlbum,
  type BareArtist,
  bareTagSchema,
  type TelegramPost,
} from '@ymh8/schemata';
import { escapeForTelegram, isAlbumNegligible } from '@ymh8/utils';
import kysely from '../database2/index.js';
import insertNewAlbums from '../database2/insert-new-albums.js';
import isAlbumKnown from '../database2/is-album-known.js';
import saveAlbumScrapeSuccess from '../database2/save-tag-scrape-success.js';
import getTagTopAlbums from '../lastfm/get-tag-top-albums.js';

async function filterNewAlbums<T extends BareAlbum>(
  transaction: Transaction<DB>,
  albums: T[],
): Promise<T[]> {
  const newAlbums: T[] = [];
  for (const album of albums) {
    if (!(await isAlbumKnown(transaction, album))) {
      newAlbums.push(album);
    }
  }
  return newAlbums;
}

/**
 *
 * @deprecated
 */
export default async function scrapeTag(jobData: unknown) {
  const bareTag = v.parse(bareTagSchema, jobData);
  return kysely.transaction().execute(async (trx) => {
    const isTagLegit = await isTagValid2(trx, bareTag);
    if (!isTagLegit) {
      // await database.update(SQL`
      //     DELETE FROM "Tag"
      //     WHERE "name" = ${bareTag.name}
      // `);
      await deleteTag(trx, bareTag.name);
      return;
    }
    const topAlbums = await getTagTopAlbums(bareTag);

    const newAlbums = await filterNewAlbums(trx, topAlbums);

    const artists = new Set(topAlbums.map((album) => album.artist));
    for (const artist of artists) {
      await enqueue(lastfmQueue, 'artist:scrape', artist, {
        name: artist,
      } satisfies BareArtist);
    }

    if (newAlbums.length === 0) {
      await saveAlbumScrapeSuccess(trx, bareTag.name);
      return;
    }

    const albumsToInsert = newAlbums.map((album) => ({
      ...album,
      hidden: isAlbumNegligible(album),
    }));
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

    // await saveNewAlbums(newAlbums);

    await saveAlbumScrapeSuccess(trx, bareTag.name);

    await enqueue(
      internalQueue,
      'tag:list:generate',
      bareTag.name,
      bareTag,
      100,
    );

    await enqueue(
      telegramQueue,
      'post',
      `scraped-tag-${bareTag.name}-${uuidv4()}`,
      {
        imageUrl: newAlbums.findLast(({ cover }) => cover)?.cover,
        text: `Зібрано ${newAlbums.length} нових альбомів для тега ${escapeForTelegram(bareTag.name)}`,
      } satisfies TelegramPost,
      newAlbums.length,
    );
    return newAlbums;
  });
}
