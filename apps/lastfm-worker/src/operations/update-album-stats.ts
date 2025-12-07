import SQL from '@nearform/sql';
import * as v from 'valibot';

import { type BareAlbum, bareAlbumSchema } from '@ymh8/schemata';
import database from '../database/index.js';
import readAlbumNumberOfTracks from '../database/read-album-number-of-tracks.js';
import getAlbumStats from '../lastfm/get-album-stats.js';

async function updateAlbumStatsAndNumberOfTracks(
  bareAlbum: BareAlbum,
  {
    listeners,
    numberOfTracks,
    playcount,
  }: {
    listeners: number;
    numberOfTracks: number;
    playcount: number;
  },
) {
  const sql = SQL`
    UPDATE "Album"
    SET "listeners" = ${listeners},
      "numberOfTracks" = ${numberOfTracks},
      "playcount" = ${playcount},
      "statsUpdatedAt" = NOW()
    WHERE "artist" = ${bareAlbum.artist}
    AND "name" = ${bareAlbum.name}
  `;
  await database.update(sql);
}

export default async function updateAlbumStats(
  jobData: unknown,
): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, jobData);
  const stats = await getAlbumStats(bareAlbum);
  if (stats.numberOfTracks) {
    const numberOfTracks = await readAlbumNumberOfTracks(bareAlbum);
    if (!numberOfTracks) {
      await updateAlbumStatsAndNumberOfTracks(bareAlbum, {
        ...stats,
        numberOfTracks: stats.numberOfTracks,
      });
      return stats;
    }
  }
  const sql = SQL`
    UPDATE "Album"
    SET "listeners" = ${stats.listeners},
      "playcount" = ${stats.playcount},
      "statsUpdatedAt" = NOW()
    WHERE "artist" = ${bareAlbum.artist}
    AND "name" = ${bareAlbum.name}
  `;
  await database.update(sql);
  return {
    ...stats,
    numberOfTracks: undefined,
  };
}
