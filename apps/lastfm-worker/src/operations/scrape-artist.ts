import * as v from 'valibot';

import { bareArtistSchema } from '@ymh8/schemata';
import { filterNewAlbums } from '../database/filter-new-albums.js';
import getArtistTopAlbums from '../lastfm/get-artist-top-albums.js';
import saveNewAlbums from '../save-new-albums.js';
import postToTelegram from '../telegram.js';
import escapeForTelegram from '../utils/escape-for-telegram.js';

const scrapeArtistPayload = v.object({
  ...bareArtistSchema.entries,
  page: v.optional(v.number()),
});

export default async function scrapeArtist(jobData: unknown) {
  const { page, ...bareArtist } = v.parse(scrapeArtistPayload, jobData);
  const topAlbums = await getArtistTopAlbums(bareArtist, page);

  const newAlbums = await filterNewAlbums(topAlbums);

  await saveNewAlbums(newAlbums);

  await postToTelegram(
    `Зібрано ${newAlbums.length} нових альбомів для виконавця ${escapeForTelegram(bareArtist.name)}`,
  );
  return newAlbums;
}
