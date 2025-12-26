import type { Job } from 'bullmq';
import * as v from 'valibot';

import { hideAlbum, readAlbumNumberOfTracks } from '@ymh8/database';
import { bareAlbumSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveAlbumStats from '../database2/save-album-stats.js';
import updateAlbumStatsAndNumberOfTracks from '../database2/save-album-stats-and-number-of-tracks.js';
import getAlbumStats from '../lastfm/get-album-stats.js';

export default async function updateAlbumStats(
  job: Job<unknown>,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, job.data);
  return kysely.transaction().execute(async (trx) => {
    try {
      const stats = await getAlbumStats(bareAlbum, job);
      if (stats.numberOfTracks) {
        const numberOfTracks = await readAlbumNumberOfTracks(trx, bareAlbum);
        if (!numberOfTracks) {
          await updateAlbumStatsAndNumberOfTracks(trx, bareAlbum, {
            ...stats,
            numberOfTracks: stats.numberOfTracks,
          });
          return stats;
        }
      }
      await saveAlbumStats(trx, bareAlbum, {
        listeners: stats.listeners,
        playcount: stats.playcount,
      });
      return {
        ...stats,
        numberOfTracks: undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Album not found')) {
        await hideAlbum(trx, bareAlbum);
        return;
      }
      throw error;
    }
  });
}
