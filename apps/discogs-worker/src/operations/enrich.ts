import SQL from '@nearform/sql';
import * as v from 'valibot';

import { bareAlbumSchema, dateString } from '@ymh8/schemata';
import database from '../database/index.js';
import searchRelease from '../discogs/search.js';

const albumDetailsSchema = v.object({
  date: v.nullable(dateString),
  numberOfTracks: v.nullable(v.pipe(v.number(), v.minValue(0))),
});

export default async function enrich(jobData: unknown): Promise<unknown> {
  const bareAlbum = v.parse(bareAlbumSchema, jobData);
  const albumDetails = await database.queryOne(
    albumDetailsSchema,
    SQL`
        SELECT "date", "numberOfTracks"
        FROM "Album"
        WHERE "artist" = ${bareAlbum.artist}
        AND "name" = ${bareAlbum.name}
    `,
  );
  if (!albumDetails) {
    throw new Error('Details not found');
  }
  if (albumDetails.date && albumDetails.numberOfTracks) {
    return;
  }
  const discogsRelease = await searchRelease(bareAlbum);

  if (!discogsRelease) {
    return;
  }

  console.log(discogsRelease);

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
  if (
    discogsRelease.released &&
    (!albumDetails.date ||
      (discogsRelease.released.length > albumDetails.date.length &&
        discogsRelease.released.startsWith(albumDetails.date)))
  ) {
    if (numberOfTracks && !albumDetails.numberOfTracks) {
      await database.update(SQL`
            UPDATE "Album"
            SET
                "date" = ${discogsRelease.released},
                "numberOfTracks" = ${numberOfTracks}
            WHERE "artist" = ${bareAlbum.artist}
            AND "name" = ${bareAlbum.name}
        `);
      return {
        date: discogsRelease.released,
        numberOfTracks: numberOfTracks,
      };
    } else {
      await database.update(SQL`
            UPDATE "Album"
            SET
                "date" = ${discogsRelease.released}
            WHERE "artist" = ${bareAlbum.artist}
            AND "name" = ${bareAlbum.name}
        `);
      return {
        date: discogsRelease.released,
      };
    }
  } else {
    if (numberOfTracks && !albumDetails.numberOfTracks) {
      await database.update(SQL`
            UPDATE "Album"
            SET
                "numberOfTracks" = ${numberOfTracks}
            WHERE "artist" = ${bareAlbum.artist}
            AND "name" = ${bareAlbum.name}
        `);
      return {
        numberOfTracks: numberOfTracks,
      };
    }
  }
}
