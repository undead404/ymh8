import * as v from 'valibot';

import { readAlbumNumberOfTracks } from '@ymh8/database';
import { bareAlbumSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveAlbumStats from '../database2/save-album-stats.js';
import updateAlbumStatsAndNumberOfTracks from '../database2/save-album-stats-and-number-of-tracks.js';
import getAlbumStats from '../lastfm/get-album-stats.js';

// async function updateAlbumStatsAndNumberOfTracks(
//   bareAlbum: BareAlbum,
//   {
//     listeners,
//     numberOfTracks,
//     playcount,
//   }: {
//     listeners: number;
//     numberOfTracks: number;
//     playcount: number;
//   },
// ) {
//   const sql = SQL`
//     UPDATE "Album"
//     SET "listeners" = ${listeners},
//       "numberOfTracks" = ${numberOfTracks},
//       "playcount" = ${playcount},
//       "statsUpdatedAt" = NOW()
//     WHERE "artist" = ${bareAlbum.artist}
//     AND "name" = ${bareAlbum.name}
//   `;
//   await database.update(sql);
// }

export default async function updateAlbumStats(
  jobData: unknown,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, jobData);
  const stats = await getAlbumStats(bareAlbum);
  return kysely.transaction().execute(async (trx) => {
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
    //   const sql = SQL`
    //   UPDATE "Album"
    //   SET "listeners" = ${stats.listeners},
    //     "playcount" = ${stats.playcount},
    //     "statsUpdatedAt" = NOW()
    //   WHERE "artist" = ${bareAlbum.artist}
    //   AND "name" = ${bareAlbum.name}
    // `;
    //   await database.update(sql);
    await saveAlbumStats(trx, bareAlbum, {
      listeners: stats.listeners,
      playcount: stats.playcount,
    });
    return {
      ...stats,
      numberOfTracks: undefined,
    };
  });
}
