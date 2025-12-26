import type { Job } from 'bullmq';
import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';
import getAlbumDetails from '../database2/get-album-details.js';
import kysely from '../database2/index.js';
import setAlbumDetails from '../database2/set-album-details.js';
import searchRelease from '../discogs/search.js';

export default async function enrich(job: Job<unknown>): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, job.data);
  return kysely.transaction().execute(async (trx) => {
    try {
      const albumDetails = await getAlbumDetails(trx, bareAlbum);
      if (albumDetails.date && albumDetails.numberOfTracks) {
        return { status: 'not_needed' };
      }
      const timeoutMs = 15 * 60 * 1000;
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        const id = setTimeout(() => {
          reject(new Error(`Search timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        // Ensure the timer doesn't hold up the process if the fetch finishes early
        // (Optional optimization, but good for clean shutdowns)
        if (typeof id.unref === 'function') id.unref();
      });
      const discogsRelease = await Promise.race([
        searchRelease(bareAlbum, job),
        timeoutPromise,
      ]);

      if (!discogsRelease) {
        return { status: 'not_found' };
      }

      // console.log(discogsRelease);

      const numberOfTracks = discogsRelease.tracklist
        ? discogsRelease.tracklist.filter(({ duration }) => {
            if (!duration) {
              return true;
            }
            const lastColonPosition = duration.lastIndexOf(':');
            const firstPart = duration.slice(0, lastColonPosition);
            const lastPart = duration.slice(lastColonPosition + 1);
            return firstPart !== '0' || Number.parseInt(lastPart) >= 30;
          }).length
        : null;
      const newDetails = {
        date: discogsRelease.released || null,
        numberOfTracks: numberOfTracks || null,
      };
      const update = await setAlbumDetails(
        trx,
        bareAlbum,
        albumDetails,
        newDetails,
      );
      return update || { status: 'no_changes' };
    } catch (error) {
      const errorMessage = `${error as Error}`;
      if (errorMessage.includes('no result')) {
        await job.log('album likely was removed');
        return { status: 'was_deleted' };
      }
      throw error;
    }
  });
}
