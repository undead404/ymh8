import type { Job } from 'bullmq';
import * as v from 'valibot';

import { hideAlbum, readAlbumStats } from '@ymh8/database';
import { bareAlbumSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveAlbumStats from '../database2/save-album-stats.js';
import updateAlbumStatsAndNumberOfTracks from '../database2/save-album-stats-and-number-of-tracks.js';
import getAlbumStats from '../lastfm/get-album-stats.js';

export default async function updateAlbumStats(
  job: Job<unknown>,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, job.data);
  const stats = await getAlbumStats(bareAlbum, job);
  return kysely.transaction().execute(async (trx) => {
    try {
      const oldStats = await readAlbumStats(trx, bareAlbum);
      if (stats.numberOfTracks && !oldStats.numberOfTracks) {
        await updateAlbumStatsAndNumberOfTracks(trx, bareAlbum, {
          ...stats,
          numberOfTracks: stats.numberOfTracks,
        });
        return {
          listeners: stats.listeners - (oldStats.listeners || 0),
          numberOfTracks: stats.numberOfTracks,
          playcount: stats.playcount - (oldStats.playcount || 0),
        };
      }
      await saveAlbumStats(trx, bareAlbum, {
        listeners: stats.listeners,
        playcount: stats.playcount,
      });
      return {
        listeners: stats.listeners - (oldStats.listeners || 0),
        playcount: stats.playcount - (oldStats.playcount || 0),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Album not found')) {
        await hideAlbum(trx, bareAlbum);
        return { status: 'not_found_in_api' };
      }
      throw error;
    }
  });
}
