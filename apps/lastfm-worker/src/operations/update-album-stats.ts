import type { Job } from 'bullmq';
import * as v from 'valibot';

import { hideAlbum, readAlbumStats } from '@ymh8/database';
import { bareAlbumSchema } from '@ymh8/schemata';
import getAlbumDetails from '../database2/get-album-details.js';
import hideArtist from '../database2/hide-artist.js';
import kysely from '../database2/index.js';
import saveAlbumStats from '../database2/save-album-stats.js';
import getAlbumStats from '../lastfm/get-album-stats.js';
import { ArtistNotFoundError } from '../lastfm/query.js';

export default async function updateAlbumStats(
  job: Job<unknown>,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, job.data);

  // 2. Транзакція бази даних
  return await kysely.transaction().execute(async (trx) => {
    try {
      const stats = await getAlbumStats(bareAlbum, job);

      const albumDetails = await getAlbumDetails(trx, bareAlbum);
      const oldStats = await readAlbumStats(trx, bareAlbum);

      const isNewTracksCount = stats.numberOfTracks && !oldStats.numberOfTracks;

      // Використовуємо єдину функцію збереження, передаючи numberOfTracks опціонально
      await saveAlbumStats(
        trx,
        { ...bareAlbum, ...albumDetails },
        {
          listeners: stats.listeners,
          playcount: stats.playcount,
          ...(isNewTracksCount && { numberOfTracks: stats.numberOfTracks }),
        },
      );

      return {
        listeners: stats.listeners - (oldStats.listeners || 0),
        playcount: stats.playcount - (oldStats.playcount || 0),
        ...(isNewTracksCount && { numberOfTracks: stats.numberOfTracks }),
      };
    } catch (error) {
      if (error instanceof ArtistNotFoundError) {
        await hideArtist(trx, bareAlbum.artist);
        return { status: 'artist_not_found_in_api' };
      }
      // Тепер ми гарантовано ловимо 404 від Last.fm API
      if (error instanceof Error && error.message.includes('Album not found')) {
        // Виконуємо запит на приховування без зовнішньої транзакції,
        // оскільки попередня (якщо була) вже скасована через throw
        await hideAlbum(trx, bareAlbum);
        return { status: 'not_found_in_api' };
      }

      throw error; // Прокидаємо інші помилки далі для ретраїв BullMQ
    }
  });
}
