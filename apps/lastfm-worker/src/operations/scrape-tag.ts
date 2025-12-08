import SQL from '@nearform/sql';
import * as v from 'valibot';

import { isTagValid } from '@ymh8/database';
import { enqueue, internalQueue, lastfmQueue } from '@ymh8/queues';
import { type BareAlbum, bareTagSchema } from '@ymh8/schemata';
import database from '../database/index.js';
import isAlbumKnown from '../database/is-album-known.js';
import getArtistTopAlbums from '../lastfm/get-artist-top-albums.js';
import getTagTopAlbums from '../lastfm/get-tag-top-albums.js';
import postToTelegram from '../telegram.js';
import escapeForTelegram from '../utils/escape-for-telegram.js';
import sleep from '../utils/sleep.js';

async function filterNewAlbums<T extends BareAlbum>(albums: T[]): Promise<T[]> {
  const newAlbums: T[] = [];
  for (const album of albums) {
    if (!(await isAlbumKnown(album))) {
      newAlbums.push(album);
    }
  }
  return newAlbums;
}

export default async function scrapeTag(jobData: unknown) {
  const bareTag = v.parse(bareTagSchema, jobData);
  const isTagLegit = await isTagValid(database, bareTag);
  if (!isTagLegit) {
    await database.update(SQL`
        DELETE FROM "Tag"
        WHERE "name" = ${bareTag.name}
    `);
    return;
  }
  const topAlbums = await getTagTopAlbums(bareTag);

  const newAlbums = await filterNewAlbums(topAlbums);

  const artists = new Set(topAlbums.map((album) => album.artist));
  for (const artist of artists) {
    await sleep(1100);
    const artistAlbums = await getArtistTopAlbums(artist);
    const newArtistAlbums = await filterNewAlbums(artistAlbums);
    newAlbums.push(...newArtistAlbums);
  }

  for (const newAlbum of newAlbums) {
    const sql = SQL`
        INSERT INTO "Album" (
            "artist",
            "cover",
            "name",
            "thumbnail"
        )
        VALUES (
            ${newAlbum.artist},
            ${newAlbum.cover ?? null},
            ${newAlbum.name},
            ${newAlbum.thumbnail ?? null}
        )
      `;
    await database.update(sql);

    await enqueue(
      lastfmQueue,
      'album:update:stats',
      newAlbum.artist + ' - ' + newAlbum.name,
      {
        artist: newAlbum.artist,
        name: newAlbum.name,
      },
    );
    await enqueue(
      lastfmQueue,
      'album:update:tags',
      newAlbum.artist + ' - ' + newAlbum.name,
      {
        artist: newAlbum.artist,
        name: newAlbum.name,
      },
    );
  }

  await database.update(SQL`
    UPDATE "Tag"
    SET "albumsScrapedAt" = NOW()
    WHERE "name" = ${bareTag.name}
  `);
  await enqueue(internalQueue, 'tag:list:generate', bareTag.name, bareTag);
  await postToTelegram(
    `Зібрано ${newAlbums.length} нових альбомів для тега ${escapeForTelegram(bareTag.name)}`,
  );
  return newAlbums;
}
